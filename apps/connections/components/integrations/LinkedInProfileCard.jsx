/**
 * LinkedIn Profile Card
 * Displays scraped LinkedIn profile data in a LinkedIn-like format
 */

import React from "react";
import {
  Paper,
  Group,
  Stack,
  Text,
  Avatar,
  Badge,
  Divider,
  Timeline,
  ThemeIcon,
  Anchor,
  Box,
} from "@mantine/core";
import {
  IconBriefcase,
  IconSchool,
  IconMapPin,
  IconUsers,
  IconBrandLinkedin,
} from "@tabler/icons-react";

/**
 * @typedef {Object} Experience
 * @property {string} [title]
 * @property {string} [companyName]
 * @property {string} [logo]
 * @property {string} [jobStartedOn]
 * @property {string} [jobEndedOn]
 * @property {boolean} [jobStillWorking]
 * @property {string} [jobLocation]
 * @property {string} [jobDescription]
 */

/**
 * @typedef {Object} Education
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {string} [logo]
 * @property {Object} [period]
 */

/**
 * @typedef {Object} LinkedInProfileData
 * @property {string} [profilePic]
 * @property {string} [fullName]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [headline]
 * @property {string} [about]
 * @property {string} [addressWithoutCountry]
 * @property {string} [jobTitle]
 * @property {string} [companyName]
 * @property {number} [followers]
 * @property {number} [connections]
 * @property {string} [linkedinUrl]
 * @property {string} [backgroundPic]
 * @property {Experience[]} [experiences]
 * @property {Education[]} [educations]
 */

/**
 * @param {{profile: LinkedInProfileData}} props
 */
export function LinkedInProfileCard({ profile }) {
  const name = profile.fullName || `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Unknown";
  const currentExperience = profile.experiences?.find((e) => e.jobStillWorking) || profile.experiences?.[0];

  return (
    <Paper shadow="sm" withBorder radius="md" style={{ overflow: "hidden" }}>
      {/* Banner */}
      <Box
        h={80}
        style={{
          background: profile.backgroundPic
            ? `url(${profile.backgroundPic}) center/cover`
            : "linear-gradient(135deg, #0077B5 0%, #00A0DC 100%)",
        }}
      />

      {/* Profile Header */}
      <Box px="lg" pb="md" style={{ marginTop: -40 }}>
        <Group align="flex-end" gap="md">
          <Avatar
            src={profile.profilePic}
            size={100}
            radius="50%"
            style={{
              border: "4px solid white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {name.charAt(0)}
          </Avatar>
        </Group>

        <Stack gap={4} mt="sm">
          <Group gap="xs" align="center">
            <Text fw={700} size="xl">
              {name}
            </Text>
            {profile.linkedinUrl && (
              <Anchor href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">
                <IconBrandLinkedin size={20} color="#0077B5" />
              </Anchor>
            )}
          </Group>

          {profile.headline && (
            <Text size="md" c="dimmed">
              {profile.headline}
            </Text>
          )}

          <Group gap="md" mt={4}>
            {profile.addressWithoutCountry && (
              <Group gap={4}>
                <IconMapPin size={14} color="gray" />
                <Text size="sm" c="dimmed">
                  {profile.addressWithoutCountry}
                </Text>
              </Group>
            )}
            {(profile.connections != null || profile.followers != null) && (
              <Group gap={4}>
                <IconUsers size={14} color="gray" />
                <Text size="sm" c="dimmed">
                  {profile.connections?.toLocaleString() || 0} connections
                  {profile.followers ? ` · ${profile.followers.toLocaleString()} followers` : ""}
                </Text>
              </Group>
            )}
          </Group>
        </Stack>

        {/* Current Position Badge */}
        {currentExperience && (
          <Group gap="xs" mt="md">
            {currentExperience.logo && (
              <Avatar src={currentExperience.logo} size={32} radius="sm" />
            )}
            <div>
              <Text size="sm" fw={500}>
                {currentExperience.title}
              </Text>
              <Text size="xs" c="dimmed">
                {currentExperience.companyName}
              </Text>
            </div>
          </Group>
        )}
      </Box>

      {/* About */}
      {profile.about && (
        <>
          <Divider />
          <Box px="lg" py="md">
            <Text fw={600} mb="xs">
              About
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {profile.about}
            </Text>
          </Box>
        </>
      )}

      {/* Experience */}
      {profile.experiences && profile.experiences.length > 0 && (
        <>
          <Divider />
          <Box px="lg" py="md">
            <Group gap="xs" mb="md">
              <IconBriefcase size={18} />
              <Text fw={600}>Experience</Text>
            </Group>
            <Timeline bulletSize={24} lineWidth={2}>
              {profile.experiences.slice(0, 5).map((exp, idx) => (
                <Timeline.Item
                  key={idx}
                  bullet={
                    exp.logo ? (
                      <Avatar src={exp.logo} size={22} radius="sm" />
                    ) : (
                      <ThemeIcon size={22} radius="xl" color="gray">
                        <IconBriefcase size={12} />
                      </ThemeIcon>
                    )
                  }
                >
                  <Text size="sm" fw={500}>
                    {exp.title}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {exp.companyName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDateRange(exp.jobStartedOn, exp.jobEndedOn, exp.jobStillWorking)}
                    {exp.jobLocation ? ` · ${exp.jobLocation}` : ""}
                  </Text>
                  {exp.jobDescription && (
                    <Text size="xs" mt={4} lineClamp={2}>
                      {exp.jobDescription}
                    </Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
            {profile.experiences.length > 5 && (
              <Text size="xs" c="dimmed" mt="xs">
                +{profile.experiences.length - 5} more positions
              </Text>
            )}
          </Box>
        </>
      )}

      {/* Education */}
      {profile.educations && profile.educations.length > 0 && (
        <>
          <Divider />
          <Box px="lg" py="md">
            <Group gap="xs" mb="md">
              <IconSchool size={18} />
              <Text fw={600}>Education</Text>
            </Group>
            <Stack gap="sm">
              {profile.educations.map((edu, idx) => (
                <Group key={idx} gap="sm" align="flex-start">
                  {edu.logo ? (
                    <Avatar src={edu.logo} size={40} radius="sm" />
                  ) : (
                    <ThemeIcon size={40} radius="sm" color="gray" variant="light">
                      <IconSchool size={20} />
                    </ThemeIcon>
                  )}
                  <div>
                    <Text size="sm" fw={500}>
                      {edu.title}
                    </Text>
                    {edu.subtitle && (
                      <Text size="xs" c="dimmed">
                        {edu.subtitle}
                      </Text>
                    )}
                  </div>
                </Group>
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Paper>
  );
}

/**
 * Format a date range string
 * @param {string | undefined} start
 * @param {string | undefined} end
 * @param {boolean | undefined} stillWorking
 * @returns {string}
 */
function formatDateRange(start, end, stillWorking) {
  if (!start) return "";

  const formatDate = (/** @type {string} */ dateStr) => {
    const parts = dateStr.split("-");
    if (parts.length === 2) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIdx = parseInt(parts[0], 10) - 1;
      return `${months[monthIdx] || parts[0]} ${parts[1]}`;
    }
    return dateStr;
  };

  const startFormatted = formatDate(start);
  const endFormatted = stillWorking ? "Present" : end ? formatDate(end) : "";

  return endFormatted ? `${startFormatted} - ${endFormatted}` : startFormatted;
}

export default LinkedInProfileCard;
