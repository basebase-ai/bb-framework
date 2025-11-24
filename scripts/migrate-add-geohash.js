#!/usr/bin/env node

/**
 * Migration Script: Add geohash field to existing events
 * 
 * This script migrates existing events in the events collection by:
 * 1. Finding all events that have coordinates but no geohash
 * 2. Generating geohash from the coordinates
 * 3. Updating the event document with the geohash field
 * 
 * Usage:
 *   node scripts/migrate-add-geohash.js <eventsCollection>
 * 
 * Example:
 *   node scripts/migrate-add-geohash.js community-calendar_events
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  writeBatch,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { geohashForLocation } from 'geofire-common';
import chalk from 'chalk';
import { firebaseConfig } from '../config/firebase.config.js';
import { authenticateUser } from './lib/auth-utils.js';

// Initialize Firebase with public config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Parse command line arguments
const args = process.argv.slice(2);
const eventsCollection = args[0];

if (!eventsCollection) {
  console.error('❌ Error: Events collection name is required');
  console.log('\nUsage: node scripts/migrate-add-geohash.js <eventsCollection>');
  console.log('Example: node scripts/migrate-add-geohash.js community-calendar_events');
  process.exit(1);
}

async function migrateEvents() {
  console.log('🔄 Starting geohash migration...');
  console.log(`📁 Collection: ${eventsCollection}\n`);

  try {
    // Authentication
    await authenticateUser(auth);

    // Query all events that have coordinates but no geohash
    console.log('📊 Querying events...');
    const eventsRef = collection(db, eventsCollection);
    const eventsSnapshot = await getDocs(eventsRef);

    if (eventsSnapshot.empty) {
      console.log('✅ No events found in collection');
      return;
    }

    console.log(`📦 Found ${eventsSnapshot.size} total events`);

    // Filter events that need migration
    const eventsToMigrate = [];
    for (const doc of eventsSnapshot.docs) {
      const data = doc.data();
      
      // Check if event has coordinates but no geohash
      if (data.coordinates && !data.geohash) {
        const lat = data.coordinates.latitude || data.coordinates._latitude;
        const lon = data.coordinates.longitude || data.coordinates._longitude;
        
        if (lat !== undefined && lon !== undefined) {
          eventsToMigrate.push({
            id: doc.id,
            data,
            lat,
            lon,
          });
        }
      }
    }

    console.log(`🎯 Found ${eventsToMigrate.length} events that need geohash migration\n`);

    if (eventsToMigrate.length === 0) {
      console.log('✅ All events already have geohash or no coordinates. Migration complete!');
      return;
    }

    // Show sample of events to be migrated
    console.log('📋 Sample events to be migrated:');
    eventsToMigrate.slice(0, 5).forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.data.title || event.id}`);
      console.log(`     Location: ${event.data.location || 'N/A'}`);
      console.log(`     Coordinates: [${event.lat}, ${event.lon}]`);
    });
    if (eventsToMigrate.length > 5) {
      console.log(`  ... and ${eventsToMigrate.length - 5} more\n`);
    }

    console.log(`\n⚠️  Updating ${eventsToMigrate.length} event documents...\n`);
    console.log('🚀 Starting migration...\n');

    // Migrate in batches of 500 (Firestore batch limit)
    const BATCH_SIZE = 500;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < eventsToMigrate.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchEvents = eventsToMigrate.slice(i, i + BATCH_SIZE);

      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchEvents.length} events)...`);

      for (const event of batchEvents) {
        try {
          // Generate geohash
          const geohash = geohashForLocation([event.lat, event.lon]);

          // Add to batch
          const docRef = doc(db, eventsCollection, event.id);
          batch.update(docRef, {
            geohash: geohash,
            lastUpdated: serverTimestamp(),
          });

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({
            eventId: event.id,
            error: error.message,
          });
          console.error(`  ❌ Error processing event ${event.id}: ${error.message}`);
        }
      }

      // Commit batch
      try {
        await batch.commit();
        console.log(`  ✅ Batch committed successfully`);
      } catch (error) {
        console.error(`  ❌ Error committing batch: ${error.message}`);
        errorCount += batchEvents.length;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`❌ Failed: ${errorCount} events`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((err, index) => {
        console.log(`  ${index + 1}. Event ${err.eventId}: ${err.error}`);
      });
    }

    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateEvents()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

