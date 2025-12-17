/**
 * MongoDB Data Operations
 *
 * Unified function for querying MongoDB databases.
 * Use the `action` parameter to specify the operation.
 *
 * Credentials are stored in user-secrets collection as:
 * { services: { mongodb: { connectionString, databaseName } } }
 *
 * @param {Object} params - Function parameters
 * @param {string} params.action - Action: "listCollections" | "query"
 * @param {string} [params.collectionName] - Collection name (required for query)
 * @param {number} [params.limit=100] - Max documents to fetch (for query)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Action-specific result
 */
module.exports = async function (params, context) {
  const { action } = params;

  if (!action) {
    throw new Error("action is required: listCollections | query");
  }

  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const db = context.firestore();

  // Get stored credentials from user-secrets
  const userSecretsDoc = await db.collection("user-secrets").doc(userId).get();
  const mongoCredentials = userSecretsDoc.exists
    ? userSecretsDoc.data()?.services?.mongodb
    : null;

  if (!mongoCredentials) {
    throw new Error(
      "MongoDB not connected. Please add your credentials first."
    );
  }

  const { connectionString, databaseName } = mongoCredentials;

  if (!connectionString || !databaseName) {
    throw new Error("Invalid stored credentials (need connectionString and databaseName)");
  }

  // Use mongodb library for connections
  const { MongoClient } = require("mongodb");

  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const database = client.db(databaseName);

    switch (action) {
      // =========================================================================
      // LIST COLLECTIONS - Get all collections in the database
      // =========================================================================
      case "listCollections": {
        context.log("Listing MongoDB collections", { userId, databaseName });

        const collectionsInfo = await database.listCollections().toArray();

        const collections = collectionsInfo.map((col) => ({
          name: col.name,
          type: col.type,
        }));

        context.log("MongoDB collections listed successfully", {
          count: collections.length,
        });

        return {
          success: true,
          collections,
          databaseName,
        };
      }

      // =========================================================================
      // QUERY - Fetch documents from a collection
      // =========================================================================
      case "query": {
        const { collectionName, limit = 100 } = params;

        if (!collectionName) {
          throw new Error("collectionName is required for query action");
        }

        context.log("Querying MongoDB collection", {
          userId,
          databaseName,
          collectionName,
          limit,
        });

        const collection = database.collection(collectionName);
        const documents = await collection
          .find({})
          .limit(Math.min(limit, 1000))
          .toArray();

        // Extract field names from documents
        const fieldSet = new Set();
        documents.forEach((doc) => {
          Object.keys(doc).forEach((key) => fieldSet.add(key));
        });
        const fields = Array.from(fieldSet);

        return {
          success: true,
          collectionName,
          databaseName,
          fields,
          documents,
          documentCount: documents.length,
        };
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Use: listCollections | query`
        );
    }
  } catch (error) {
    context.error("MongoDB operation failed:", error);

    if (error.name === "MongoServerSelectionError") {
      throw new Error(
        "Cannot connect to MongoDB server. Please check your connection string."
      );
    }

    if (error.code === 18 || error.codeName === "AuthenticationFailed") {
      throw new Error(
        "Authentication failed. Please check your credentials."
      );
    }

    throw new Error(error.message || "MongoDB operation failed");
  } finally {
    await client.close();
  }
};
