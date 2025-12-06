import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Card,
  Text,
  TextInput,
  Button,
  Group,
  Stack,
  Avatar,
  Textarea,
  Select,
  ActionIcon,
  Autocomplete,
  Alert,
} from "@mantine/core";
import {
  IconKey,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconPlus,
  IconUserPlus,
  IconX,
  IconUpload,
  IconCopy,
  IconPhoto,
  IconUser,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { useDocument } from "../../../../framework/hooks/useDocument.js";
import { useUserProfiles } from "../../../../framework/hooks/useUserProfiles.js";
import { useStorage } from "../../../../framework/hooks/useStorage.js";
import { showNotification } from "@mantine/notifications";
import { EditImage } from "../../../../framework/components/EditImage.jsx";
import { APP_ID } from "../../schema.js";

export default function SettingsTab({ app, onUpdate, onDelete, onClose }) {
  const { user } = useAuth();
  const { upload, uploading, progress } = useStorage(APP_ID);
  const { data: allUsers = [] } = useCollection("users");
  
  const { 
    data: secretsDoc, 
    loading: secretsLoading, 
    exists: secretsExist,
    set: setSecrets,
    update: updateSecrets,
  } = useDocument("app-secrets", app?.id);

  const [formData, setFormData] = useState({
    name: app?.name || "",
    description: app?.description || "",
    logoURL: app?.logoURL || "",
    accessMode: app?.accessMode || "open",
    publicUse: app?.publicUse ?? true,
    publicEdit: app?.publicEdit ?? false,
    collaborators: app?.collaborators || [],
  });

  const [secrets, setLocalSecrets] = useState([]);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [secretsModified, setSecretsModified] = useState(false);
  const [savingSecrets, setSavingSecrets] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [assets, setAssets] = useState(app?.assets || []);
  const [ownershipSearch, setOwnershipSearch] = useState("");
  const [pendingNewOwner, setPendingNewOwner] = useState(null);
  const [transferring, setTransferring] = useState(false);

  const isOwner = user && app?.owner === user.uid;
  const debounceTimerRef = useRef(null);

  const debouncedSave = useCallback((field, value) => {
    if (!app?.id) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onUpdate(app.id, { [field]: value }, { silent: true });
    }, 500);
  }, [app?.id, onUpdate]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const { profiles: collaboratorProfiles } = useUserProfiles(formData.collaborators);

  const userAutocompleteData = useMemo(() => {
    if (!allUsers) return [];
    const excludeIds = new Set([app?.owner, ...(formData.collaborators || [])]);
    const seenEmails = new Set();
    return allUsers
      .filter((u) => !excludeIds.has(u.id))
      .filter((u) => {
        if (!u.email || seenEmails.has(u.email)) return false;
        seenEmails.add(u.email);
        return true;
      })
      .map((u) => ({
        value: u.email,
        label: u.displayName ? `${u.displayName} (${u.email})` : u.email,
        userId: u.id,
      }));
  }, [allUsers, app?.owner, formData.collaborators]);

  const ownershipAutocompleteData = useMemo(() => {
    if (!allUsers) return [];
    const seenEmails = new Set();
    return allUsers
      .filter((u) => u.id !== app?.owner)
      .filter((u) => {
        if (!u.email || seenEmails.has(u.email)) return false;
        seenEmails.add(u.email);
        return true;
      })
      .map((u) => ({
        value: u.email,
        label: u.displayName ? `${u.displayName} (${u.email})` : u.email,
        userId: u.id,
        displayName: u.displayName || u.email,
        photoURL: u.photoURL,
      }));
  }, [allUsers, app?.owner]);

  const handleAddCollaborator = (selectedValue) => {
    const selectedUser = userAutocompleteData.find(u => u.value === selectedValue);
    if (selectedUser && !formData.collaborators.includes(selectedUser.userId)) {
      const newCollaborators = [...formData.collaborators, selectedUser.userId];
      setFormData({ ...formData, collaborators: newCollaborators });
      onUpdate(app.id, { collaborators: newCollaborators }, { silent: true });
    }
    setTimeout(() => setCollaboratorSearch(""), 0);
  };

  const handleRemoveCollaborator = (userId) => {
    const newCollaborators = formData.collaborators.filter(id => id !== userId);
    setFormData({ ...formData, collaborators: newCollaborators });
    onUpdate(app.id, { collaborators: newCollaborators }, { silent: true });
  };

  const handleSelectNewOwner = (selectedValue) => {
    const selectedUser = ownershipAutocompleteData.find(u => u.value === selectedValue);
    if (selectedUser) setPendingNewOwner(selectedUser);
    setTimeout(() => setOwnershipSearch(""), 0);
  };

  const handleTransferOwnership = async () => {
    if (!pendingNewOwner || !app || !user) return;
    setTransferring(true);
    try {
      const oldOwnerId = app.owner;
      const newOwnerId = pendingNewOwner.userId;
      const existingCollaborators = formData.collaborators || [];
      const newCollaborators = [
        ...existingCollaborators.filter(id => id !== newOwnerId),
        oldOwnerId,
      ];
      await onUpdate(app.id, { owner: newOwnerId, collaborators: newCollaborators }, { silent: true });
      showNotification({
        title: "Ownership Transferred",
        message: `${pendingNewOwner.displayName} is now the owner of this app`,
        color: "teal",
      });
      onClose();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      showNotification({ title: "Error", message: "Failed to transfer ownership.", color: "red" });
    } finally {
      setTransferring(false);
      setPendingNewOwner(null);
    }
  };

  useEffect(() => {
    if (app) {
      setFormData({
        name: app.name || "",
        description: app.description || "",
        logoURL: app.logoURL || "",
        accessMode: app.accessMode || "open",
        publicUse: app.publicUse ?? true,
        publicEdit: app.publicEdit ?? false,
        collaborators: app.collaborators || [],
      });
      setAssets(app.assets || []);
    }
  }, [app]);

  useEffect(() => {
    if (secretsDoc?.secrets) {
      const secretsArray = Object.entries(secretsDoc.secrets).map(([key, value]) => ({ key, value }));
      setLocalSecrets(secretsArray);
      setSecretsModified(false);
    } else {
      setLocalSecrets([]);
      setSecretsModified(false);
    }
    setRevealedSecrets(new Set());
  }, [secretsDoc]);

  const handleLogoUpload = async (file) => {
    try {
      const path = `app-logos/${app.id}/${Date.now()}_${file.name}`;
      const result = await upload(file, path);
      setFormData({ ...formData, logoURL: result.url });
      onUpdate(app.id, { logoURL: result.url }, { silent: true });
    } catch (err) {
      showNotification({ title: "Error", message: "Failed to upload logo.", color: "red" });
    }
  };

  const handleLogoClear = async () => {
    setFormData({ ...formData, logoURL: "" });
    onUpdate(app.id, { logoURL: null }, { silent: true });
  };

  const handleAssetUpload = async (file) => {
    setUploadingAsset(true);
    try {
      const path = `app-assets/${app.id}/${Date.now()}_${file.name}`;
      const result = await upload(file, path);
      const newAsset = { url: result.url, name: file.name, type: file.type, size: file.size, uploadedAt: new Date().toISOString() };
      const updatedAssets = [...assets, newAsset];
      setAssets(updatedAssets);
      onUpdate(app.id, { assets: updatedAssets }, { silent: true });
      navigator.clipboard.writeText(result.url);
      showNotification({ title: "Asset uploaded", message: "Image URL copied to clipboard", color: "teal" });
    } catch (err) {
      showNotification({ title: "Error", message: "Failed to upload asset.", color: "red" });
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleRemoveAsset = (assetUrl) => {
    const updatedAssets = assets.filter(a => a.url !== assetUrl);
    setAssets(updatedAssets);
    onUpdate(app.id, { assets: updatedAssets }, { silent: true });
  };

  const handleAddSecret = () => {
    const trimmedKey = newSecretKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const trimmedValue = newSecretValue.trim();
    if (!trimmedKey) return;
    if (secrets.some(s => s.key === trimmedKey)) {
      showNotification({ title: "Error", message: "Secret key already exists", color: "red" });
      return;
    }
    setLocalSecrets([...secrets, { key: trimmedKey, value: trimmedValue }]);
    setNewSecretKey("");
    setNewSecretValue("");
    setSecretsModified(true);
  };

  const handleRemoveSecret = (keyToRemove) => {
    setLocalSecrets(secrets.filter(s => s.key !== keyToRemove));
    setSecretsModified(true);
  };

  const handleSaveSecrets = async () => {
    setSavingSecrets(true);
    try {
      const secretsObject = {};
      for (const { key, value } of secrets) secretsObject[key] = value;
      if (secretsExist) await updateSecrets({ secrets: secretsObject, appId: app.id });
      else await setSecrets({ secrets: secretsObject, appId: app.id });
      setSecretsModified(false);
      showNotification({ title: "Success", message: "Secrets saved", color: "teal" });
    } catch (err) {
      showNotification({ title: "Error", message: "Failed to save secrets", color: "red" });
    } finally {
      setSavingSecrets(false);
    }
  };

  const toggleRevealSecret = (key) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!isOwner && !app?.collaborators?.includes(user?.uid)) {
    return (
      <Card withBorder>
        <Stack align="center" py="lg">
          <IconSettings size={32} opacity={0.3} />
          <Text size="sm" c="dimmed">Only the owner and collaborators can access settings.</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {/* Basic Info */}
      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>App Logo</Text>
          <EditImage
            value={formData.logoURL}
            onChange={handleLogoClear}
            onUpload={handleLogoUpload}
            uploading={uploading}
            progress={progress}
            size={80}
            maxSize={2 * 1024 * 1024}
          />
          
          <TextInput
            label="App Name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              debouncedSave('name', e.target.value);
            }}
          />
          
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              debouncedSave('description', e.target.value);
            }}
            minRows={3}
          />
          
          <Select
            label="Access Mode"
            value={formData.accessMode}
            onChange={(value) => {
              setFormData({ ...formData, accessMode: value || "open" });
              onUpdate(app.id, { accessMode: value || "open" }, { silent: true });
            }}
            data={[
              { value: "open", label: "Open - Anyone can use" },
              { value: "invite-only", label: "Invite Only - Requires membership" },
            ]}
          />
          
          <Group grow>
            <Button
              variant={formData.publicUse ? "filled" : "outline"}
              color={formData.publicUse ? "teal" : "gray"}
              onClick={() => {
                const newVal = !formData.publicUse;
                setFormData({ ...formData, publicUse: newVal });
                onUpdate(app.id, { publicUse: newVal }, { silent: true });
              }}
              size="xs"
            >
              Public Use: {formData.publicUse ? "Yes" : "No"}
            </Button>
            <Button
              variant={formData.publicEdit ? "filled" : "outline"}
              color={formData.publicEdit ? "teal" : "gray"}
              onClick={() => {
                const newVal = !formData.publicEdit;
                setFormData({ ...formData, publicEdit: newVal });
                onUpdate(app.id, { publicEdit: newVal }, { silent: true });
              }}
              size="xs"
            >
              Public Edit: {formData.publicEdit ? "Yes" : "No"}
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Collaborators */}
      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Collaborators</Text>
          
          {formData.collaborators.length > 0 && (
            <Stack gap="xs">
              {formData.collaborators.map((userId) => {
                const profile = collaboratorProfiles.get(userId);
                return (
                  <Group key={userId} gap="sm" style={{ padding: '6px 10px', background: 'rgba(147, 51, 234, 0.05)', borderRadius: '6px' }}>
                    <Avatar src={profile?.photoURL} size="sm" radius="xl" color="violet">
                      {(profile?.displayName || profile?.email || userId).charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{profile?.displayName || profile?.email || userId}</Text>
                    </div>
                    <ActionIcon size="sm" color="red" variant="subtle" onClick={() => handleRemoveCollaborator(userId)}>
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          )}
          
          <Autocomplete
            placeholder="Search by name or email..."
            value={collaboratorSearch}
            onChange={setCollaboratorSearch}
            onOptionSubmit={handleAddCollaborator}
            data={userAutocompleteData}
            limit={5}
            leftSection={<IconUserPlus size={14} />}
          />
        </Stack>
      </Card>

      {/* Secrets */}
      {isOwner && (
        <Card withBorder>
          <Stack gap="sm">
            <Group gap="xs">
              <IconKey size={16} />
              <Text size="sm" fw={600}>App Secrets</Text>
            </Group>
            <Text size="xs" c="dimmed">Encrypted environment variables for this app.</Text>
            
            {secretsLoading ? (
              <Text size="sm" c="dimmed">Loading...</Text>
            ) : (
              <>
                {secrets.map(({ key, value }) => (
                  <Group key={key} gap="xs">
                    <TextInput value={key} readOnly size="xs" style={{ flex: 1, maxWidth: 140 }} styles={{ input: { fontFamily: 'monospace' } }} />
                    <TextInput
                      value={revealedSecrets.has(key) ? value : '•'.repeat(Math.min(value.length, 20))}
                      readOnly
                      size="xs"
                      style={{ flex: 2 }}
                      styles={{ input: { fontFamily: 'monospace' } }}
                      rightSection={
                        <ActionIcon size="xs" variant="subtle" onClick={() => toggleRevealSecret(key)}>
                          {revealedSecrets.has(key) ? <IconEyeOff size={12} /> : <IconEye size={12} />}
                        </ActionIcon>
                      }
                    />
                    <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveSecret(key)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
                
                <Group gap="xs">
                  <TextInput
                    placeholder="SECRET_KEY"
                    value={newSecretKey}
                    onChange={(e) => setNewSecretKey(e.target.value.toUpperCase())}
                    size="xs"
                    style={{ flex: 1, maxWidth: 140 }}
                    styles={{ input: { fontFamily: 'monospace' } }}
                  />
                  <TextInput
                    placeholder="value"
                    value={newSecretValue}
                    onChange={(e) => setNewSecretValue(e.target.value)}
                    size="xs"
                    style={{ flex: 2 }}
                  />
                  <ActionIcon color="violet" variant="filled" size="sm" onClick={handleAddSecret} disabled={!newSecretKey.trim()}>
                    <IconPlus size={14} />
                  </ActionIcon>
                </Group>
                
                {secretsModified && (
                  <Button variant="light" size="xs" leftSection={<IconKey size={12} />} onClick={handleSaveSecrets} loading={savingSecrets}>
                    Save Secrets
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Card>
      )}

      {/* Assets */}
      <Card withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <IconPhoto size={16} />
            <Text size="sm" fw={600}>App Assets</Text>
          </Group>
          <Text size="xs" c="dimmed">Upload images for sharing, meta tags, or app content.</Text>
          
          {assets.map((asset, index) => (
            <Group key={asset.url || index} gap="xs" style={{ padding: '6px', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
              {asset.type?.startsWith('image/') && (
                <img src={asset.url} alt={asset.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" fw={500} truncate>{asset.name}</Text>
              </div>
              <ActionIcon size="xs" variant="subtle" color="violet" onClick={() => { navigator.clipboard.writeText(asset.url); showNotification({ message: "Copied!", color: "teal" }); }}>
                <IconCopy size={12} />
              </ActionIcon>
              <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleRemoveAsset(asset.url)}>
                <IconTrash size={12} />
              </ActionIcon>
            </Group>
          ))}
          
          <Button
            variant="light"
            size="xs"
            leftSection={<IconUpload size={12} />}
            loading={uploadingAsset}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) handleAssetUpload(file);
              };
              input.click();
            }}
          >
            Upload Image
          </Button>
        </Stack>
      </Card>

      {/* Transfer Ownership */}
      {isOwner && (
        <Card withBorder>
          <Stack gap="sm">
            <Group gap="xs">
              <IconUser size={16} />
              <Text size="sm" fw={600}>Transfer Ownership</Text>
            </Group>
            <Text size="xs" c="dimmed">Transfer this app to another user. You will become a collaborator.</Text>
            
            {!pendingNewOwner ? (
              <Autocomplete
                placeholder="Search for new owner..."
                value={ownershipSearch}
                onChange={setOwnershipSearch}
                onOptionSubmit={handleSelectNewOwner}
                data={ownershipAutocompleteData}
                limit={5}
                leftSection={<IconSearch size={14} />}
              />
            ) : (
              <>
                <Alert color="orange" variant="light">
                  <Text size="sm" fw={500}>Transfer to {pendingNewOwner.displayName}?</Text>
                  <Text size="xs" c="dimmed">You will lose owner privileges.</Text>
                </Alert>
                <Group gap="xs" grow>
                  <Button variant="subtle" onClick={() => setPendingNewOwner(null)} disabled={transferring}>Cancel</Button>
                  <Button color="orange" onClick={handleTransferOwnership} loading={transferring}>Transfer</Button>
                </Group>
              </>
            )}
          </Stack>
        </Card>
      )}

      {/* Delete App */}
      {isOwner && (
        <Card withBorder style={{ borderColor: 'var(--mantine-color-red-3)' }}>
          <Stack gap="sm">
            {!showDeleteConfirm ? (
              <Button variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={() => setShowDeleteConfirm(true)}>
                Delete App
              </Button>
            ) : (
              <>
                <Alert color="red" variant="light">
                  <Text size="sm" fw={500}>Delete "{app.name}"?</Text>
                  <Text size="xs" c="dimmed">This cannot be undone.</Text>
                </Alert>
                <Group gap="xs" grow>
                  <Button variant="subtle" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
                  <Button
                    color="red"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await onDelete(app.id);
                        onClose();
                      } catch (err) {
                        showNotification({ title: "Error", message: "Failed to delete app", color: "red" });
                      } finally {
                        setDeleting(false);
                        setShowDeleteConfirm(false);
                      }
                    }}
                    loading={deleting}
                  >
                    Delete
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

