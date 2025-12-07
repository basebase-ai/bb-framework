/**
 * Flyshare Schema - Flight Sharing Service
 *
 * Collections for managing flights, bookings, pilots, aircraft, and airports
 */

// Your app's unique identifier
export const APP_ID = "flyshare";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // Flyshare-specific collections
  flights: `${APP_ID}_flights`,
  airports: `${APP_ID}_airports`,
  aircraft: `${APP_ID}_aircraft`,
  pilots: `${APP_ID}_pilots`,
  bookings: `${APP_ID}_bookings`,
};

/**
 * Helper function to create a namespaced collection name
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

// Schema definitions for type generation and documentation
export const schema = {
  flights: {
    fields: {
      id: { type: "string", required: true },
      origin_code: { type: "string", required: true }, // Airport code (e.g., "DUB")
      destination_code: { type: "string", required: true },
      departure: { type: "timestamp", required: true },
      arrival: { type: "timestamp", required: true },
      price: { type: "number", required: true }, // Price per seat
      seats_available: { type: "number", required: true },
      pilot_id: { type: "string", required: true },
      aircraft_id: { type: "string", required: true },
      status: {
        type: "enum",
        values: [
          "scheduled",
          "boarding",
          "in_flight",
          "completed",
          "cancelled",
        ],
        default: "scheduled",
      },
      description: { type: "string" },
      created_at: { type: "timestamp", auto: true },
      updated_at: { type: "timestamp", auto: true },
    },
  },

  airports: {
    fields: {
      code: { type: "string", required: true }, // IATA code
      name: { type: "string", required: true },
      country: { type: "string", required: true },
      coordinates: { type: "array" }, // [longitude, latitude]
      created_at: { type: "timestamp", auto: true },
      updated_at: { type: "timestamp", auto: true },
    },
  },

  aircraft: {
    fields: {
      id: { type: "string", required: true },
      registration: { type: "string", required: true }, // e.g., "EI-FLY"
      manufacturer: { type: "string", required: true },
      model: { type: "string", required: true },
      year: { type: "number" },
      capacity: { type: "number", required: true },
      description: { type: "string" },
      images: { type: "array" }, // Array of image URLs
      pet_friendly: { type: "boolean", default: false },
      pilot_id: { type: "string" },
      created_at: { type: "timestamp", auto: true },
      updated_at: { type: "timestamp", auto: true },
    },
  },

  pilots: {
    fields: {
      id: { type: "string", required: true },
      user_id: { type: "string", required: true }, // Links to users collection
      license_number: { type: "string", required: true },
      experience_years: { type: "number" },
      rating: { type: "number" }, // 0-5 rating
      total_flights: { type: "number", default: 0 },
      created_at: { type: "timestamp", auto: true },
      updated_at: { type: "timestamp", auto: true },
    },
  },

  bookings: {
    fields: {
      id: { type: "string", required: true },
      flight_id: { type: "string", required: true },
      user_id: { type: "string", required: true },
      seats: { type: "number", required: true },
      price: { type: "number", required: true }, // Total price
      passengers: { type: "array" }, // Array of passenger info objects
      status: {
        type: "enum",
        values: ["pending", "confirmed", "cancelled", "completed"],
        default: "pending",
      },
      notes: { type: "string" },
      created_at: { type: "timestamp", auto: true },
      updated_at: { type: "timestamp", auto: true },
    },
  },
};
