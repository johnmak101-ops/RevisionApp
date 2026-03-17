import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mongoose before import
vi.mock("mongoose", () => {
  const mockConnect = vi.fn().mockResolvedValue("connected");
  return {
    default: {
      connect: mockConnect,
      Types: { ObjectId: vi.fn() },
    },
    Schema: vi.fn().mockImplementation(() => ({
      index: vi.fn(),
    })),
    model: vi.fn(),
    models: {},
  };
});

describe("db module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the cached connection
    (global as Record<string, unknown>).mongoose = undefined;
  });

  describe("getMongoUri (via connectDB)", () => {
    it("throws when MONGODB_URI is not set", async () => {
      delete process.env.MONGODB_URI;
      // Force re-import
      vi.resetModules();
      const { connectDB } = await import("../db");
      await expect(connectDB()).rejects.toThrow("Please define MONGODB_URI");
    });

    it("throws when URI has invalid prefix", async () => {
      process.env.MONGODB_URI = "http://invalid-uri";
      vi.resetModules();
      const { connectDB } = await import("../db");
      await expect(connectDB()).rejects.toThrow('must start with "mongodb://"');
    });

    it("strips surrounding quotes from URI", async () => {
      process.env.MONGODB_URI = '"mongodb://localhost/test"';
      vi.resetModules();
      const { connectDB } = await import("../db");
      await connectDB();
      const mongoose = (await import("mongoose")).default;
      expect(mongoose.connect).toHaveBeenCalledWith("mongodb://localhost/test");
    });

    it("connects successfully with valid URI", async () => {
      process.env.MONGODB_URI = "mongodb+srv://user:pass@cluster.mongodb.net/revision";
      vi.resetModules();
      const { connectDB } = await import("../db");
      await connectDB();
      const mongoose = (await import("mongoose")).default;
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });

    it("reuses cached connection on second call", async () => {
      process.env.MONGODB_URI = "mongodb://localhost/test";
      vi.resetModules();
      const { connectDB } = await import("../db");
      await connectDB();
      await connectDB();
      const mongoose = (await import("mongoose")).default;
      // Only one actual connect call despite two connectDB calls
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });
  });
});
