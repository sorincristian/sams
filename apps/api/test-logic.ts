// Mocks and test logic to PROVE behavior
import { StockClass, ConditionSource } from "@prisma/client";

// MOCK Database Data
let mockPool: any[] = [];

// Method logic directly from our service to prove behavior
async function reserveBestReplacementMock(garageId: string, seatInsertTypeId: string) {
  const available = mockPool.filter(s => 
    s.locationId === garageId && 
    s.seatInsertTypeId === seatInsertTypeId && 
    s.stockClass === "REPLACEMENT_AVAILABLE"
  );

  console.log(`[Query] Found ${available.length} eligible units in local replacement pool`);

  if (available.length === 0) {
    throw new Error("Removal blocked: no local replacement available.");
  }

  // Priority 1: REBUILT
  let chosen = available.find(s => s.conditionSource === "REBUILT");
  if (chosen) {
    console.log(`[Selection] Selected Priority 1 (REBUILT): Unit ${chosen.id}`);
  }
  
  // Priority 2: NEW
  if (!chosen) {
    chosen = available.find(s => s.conditionSource === "NEW");
    if (chosen) console.log(`[Selection] Selected Priority 2 (NEW): Unit ${chosen.id}`);
  }

  if (!chosen) {
    throw new Error("Removal blocked: no local replacement available.");
  }

  return chosen;
}

async function harveyCompleteMock(id: string) {
  const unit = mockPool.find(s => s.id === id);
  if (!unit) return;
  unit.stockClass = "REPLACEMENT_AVAILABLE";
  unit.conditionSource = "REBUILT";
  console.log(`[Harvey Receipt] Unit ${id} returned to REPLACEMENT_AVAILABLE with REBUILT condition.`);
}

async function runTests() {
  console.log("=== Scenario 1: Both exist ===");
  mockPool = [
    { id: "A", locationId: "G1", seatInsertTypeId: "TYPE1", stockClass: "REPLACEMENT_AVAILABLE", conditionSource: "NEW" },
    { id: "B", locationId: "G1", seatInsertTypeId: "TYPE1", stockClass: "REPLACEMENT_AVAILABLE", conditionSource: "REBUILT" }
  ];
  await reserveBestReplacementMock("G1", "TYPE1");

  console.log("\n=== Scenario 2: Only NEW exists ===");
  mockPool = [
    { id: "C", locationId: "G1", seatInsertTypeId: "TYPE1", stockClass: "REPLACEMENT_AVAILABLE", conditionSource: "NEW" },
  ];
  await reserveBestReplacementMock("G1", "TYPE1");

  console.log("\n=== Scenario 3: Pool is zero ===");
  mockPool = [
    { id: "D", locationId: "G2", seatInsertTypeId: "TYPE1", stockClass: "REPLACEMENT_AVAILABLE", conditionSource: "NEW" }, // Different garage
    { id: "E", locationId: "G1", seatInsertTypeId: "TYPE1", stockClass: "DIRTY_RECOVERY" } // Not available
  ];
  try {
    await reserveBestReplacementMock("G1", "TYPE1");
  } catch (e: any) {
    console.log("[Error Caught]", e.message);
  }

  console.log("\n=== Scenario 4: Harvey completion restores availability ===");
  mockPool = [
    { id: "F", locationId: "G1", seatInsertTypeId: "TYPE1", stockClass: "HARVEY_IN_PROGRESS" }
  ];
  await harveyCompleteMock("F");
  // Try reserving now!
  await reserveBestReplacementMock("G1", "TYPE1");
}

runTests();
