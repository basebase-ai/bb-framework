/**
 * APKG Parser - Parse Anki .apkg files in the browser
 * 
 * Uses JSZip for extraction and sql.js for SQLite parsing
 * Properly configures WASM path for browser usage
 */

import JSZip from "jszip";
import initSqlJs from "sql.js";

/**
 * @typedef {Object} ParsedCard
 * @property {string} front
 * @property {string} back
 */

/**
 * @typedef {Object} RawNote
 * @property {string[]} fields - All fields from the note
 */

/**
 * @typedef {Object} ParsedDeck
 * @property {string | null} deckName
 * @property {ParsedCard[]} cards
 * @property {RawNote[]} rawNotes - Raw notes with all fields for custom mapping
 * @property {string[]} sampleFields - Sample of field values from first note
 * @property {number} fieldCount - Number of fields per note
 */

/**
 * Strip HTML tags and clean up text
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return "";
  
  let text = html;
  
  // Remove style tags AND their contents
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  
  // Remove script tags AND their contents
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  
  // Remove audio tags and sound references
  text = text.replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, "");
  text = text.replace(/\[sound:[^\]]+\]/gi, "");
  
  // Convert block elements to line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  
  // Strip remaining tags using DOM
  const temp = document.createElement("div");
  temp.innerHTML = text;
  text = temp.textContent || temp.innerText || "";
  
  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  return text;
}

/**
 * Parse an APKG file and extract cards
 * @param {File} file - The .apkg file to parse
 * @returns {Promise<ParsedDeck>}
 */
export async function parseApkgFile(file) {
  // Initialize sql.js with correct WASM path
  const SQL = await initSqlJs({
    locateFile: (/** @type {string} */ filename) => `/${filename}`,
  });
  
  // Read and unzip the APKG file
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // List all files in the archive for debugging
  const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir);
  console.log("[APKG Parser] Files in archive:", fileNames);
  
  // Find the collection database (collection.anki2, collection.anki21, or collection.anki22)
  /** @type {JSZip.JSZipObject | null} */
  let collectionFile = null;
  let collectionFileName = "";
  const possibleNames = ["collection.anki21", "collection.anki2", "collection.anki22"];
  
  for (const name of possibleNames) {
    const file = zip.file(name);
    if (file) {
      collectionFile = file;
      collectionFileName = name;
      break;
    }
  }
  
  if (!collectionFile) {
    throw new Error("Could not find Anki database in APKG file. Files found: " + fileNames.join(", "));
  }
  
  console.log("[APKG Parser] Using database file:", collectionFileName);
  
  // Load the SQLite database
  const dbBuffer = await collectionFile.async("uint8array");
  const db = new SQL.Database(dbBuffer);
  
  // Get deck name from col table or decks table
  /** @type {string | null} */
  let deckName = null;
  
  try {
    // Try modern format first (decks table)
    const decksResult = db.exec("SELECT name FROM decks LIMIT 1");
    if (decksResult.length > 0 && decksResult[0].values.length > 0) {
      deckName = String(decksResult[0].values[0][0]);
    }
  } catch {
    // Fall back to legacy format (col table with JSON)
    try {
      const colResult = db.exec("SELECT decks FROM col LIMIT 1");
      if (colResult.length > 0 && colResult[0].values.length > 0) {
        const decksJson = JSON.parse(String(colResult[0].values[0][0]));
        const deckIds = Object.keys(decksJson);
        if (deckIds.length > 0) {
          // Skip the default deck (id "1") if there are others
          const nonDefaultDeck = deckIds.find(id => id !== "1");
          const deckId = nonDefaultDeck || deckIds[0];
          deckName = decksJson[deckId]?.name || null;
        }
      }
    } catch {
      // Ignore deck name extraction errors
    }
  }
  
  // Debug: list all tables in the database
  const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  const tables = tablesResult.length > 0 ? tablesResult[0].values.map(r => r[0]) : [];
  console.log("[APKG Parser] Tables found:", tables);
  
  /** @type {RawNote[]} */
  const rawNotes = [];
  /** @type {string[]} */
  let sampleFields = [];
  let fieldCount = 0;
  
  // Try to get notes - check which table exists
  const hasNotesTable = tables.includes("notes");
  
  if (hasNotesTable) {
    // Get column info for notes table
    const columnsResult = db.exec("PRAGMA table_info(notes)");
    const columns = columnsResult.length > 0 ? columnsResult[0].values.map(r => r[1]) : [];
    console.log("[APKG Parser] Notes table columns:", columns);
    
    // Get all notes
    const notesResult = db.exec("SELECT * FROM notes");
    console.log("[APKG Parser] Notes count:", notesResult.length > 0 ? notesResult[0].values.length : 0);
    
    if (notesResult.length > 0 && notesResult[0].values.length > 0) {
      // Find the flds column index
      const fldsIndex = columns.indexOf("flds");
      
      console.log("[APKG Parser] flds index:", fldsIndex);
      
      for (const row of notesResult[0].values) {
        const flds = String(row[fldsIndex] || "");
        
        // flds contains all fields separated by \x1f (unit separator)
        const fields = flds.split("\x1f").map(f => stripHtml(f).trim());
        
        rawNotes.push({ fields });
        
        // Capture sample from first note
        if (sampleFields.length === 0 && fields.length > 0) {
          sampleFields = fields;
          fieldCount = fields.length;
          console.log("[APKG Parser] Field count:", fieldCount);
          console.log("[APKG Parser] Sample fields:", sampleFields.map((f, i) => `[${i}] ${f.substring(0, 30)}`));
        }
      }
    }
  } else {
    console.log("[APKG Parser] No 'notes' table found. This might be an Anki 2.1.50+ format.");
  }
  
  // Close database
  db.close();
  
  // Default card extraction: field 0 = front, field 1 = back
  // But return raw notes so caller can remap if needed
  /** @type {ParsedCard[]} */
  const cards = rawNotes
    .filter(note => note.fields.length >= 2)
    .map(note => ({
      front: note.fields[0],
      back: note.fields[1],
    }))
    .filter(card => card.front && card.back && card.front !== card.back);
  
  console.log(`[APKG Parser] Extracted ${cards.length} cards (default mapping) from "${deckName || 'Unknown deck'}"`);
  
  return { deckName, cards, rawNotes, sampleFields, fieldCount };
}

/**
 * Map raw notes to cards using specified field indices
 * @param {RawNote[]} rawNotes
 * @param {number} frontIndex
 * @param {number} backIndex
 * @returns {ParsedCard[]}
 */
export function mapNotesToCards(rawNotes, frontIndex, backIndex) {
  return rawNotes
    .filter(note => note.fields.length > Math.max(frontIndex, backIndex))
    .map(note => ({
      front: note.fields[frontIndex] || "",
      back: note.fields[backIndex] || "",
    }))
    .filter(card => card.front && card.back && card.front !== card.back);
}

