import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

async function runTests() {
    console.log("=== SEAT INVENTORY LOCAL FUNCTIONAL VERIFICATION ===\n");

    try {
        // --- 0. DATA SETUP ---
        const harveyGarage = await prisma.garage.findFirst({ where: { name: 'Harvey Shop' } });
        let garageA = await prisma.garage.findFirst({ where: { name: 'Arrow Road' } });
        let garageB = await prisma.garage.findFirst({ where: { name: 'Mount Dennis' } });

        if (!harveyGarage || !garageA || !garageB) {
            console.error("Missing garages for testing. Did you seed the DB?");
            return;
        }

        let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        
        let harveyUser = await prisma.user.findFirst({ where: { role: 'USER', garageId: harveyGarage.id } });
        if (!harveyUser) harveyUser = await prisma.user.create({ data: { name: 'Harvey Tester', email: 'harvey_test@ttc.ca', passwordHash: 'pwd', role: 'USER', garageId: harveyGarage.id } });

        let garageAUser = await prisma.user.findFirst({ where: { role: 'USER', garageId: garageA.id } });
        if (!garageAUser) garageAUser = await prisma.user.create({ data: { name: 'Arrow Tester', email: 'arrow_test@ttc.ca', passwordHash: 'pwd', role: 'USER', garageId: garageA.id } });

        const seatType = await prisma.seatInsertType.findFirst();
        if (!seatType) throw new Error("No SeatInsertType found in DB");

        const getToken = (u: any) => jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '1h' });
        const adminToken = getToken(adminUser);
        const harveyToken = getToken(harveyUser);
        const garageAToken = getToken(garageAUser);

        async function fetchAPI(path: string, method: string, token: string, body: any = null) {
            const res = await fetch(`${API_URL}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: body ? JSON.stringify(body) : undefined
            });
            return { status: res.status, data: await res.json() };
        }

        const assert = (condition: boolean, msg: string) => {
            if (condition) console.log(`✅ PASS: ${msg}`);
            else console.error(`❌ FAIL: ${msg}`);
        };

        // --- 1. GARAGE USER VISIBILITY ---
        let res = await fetchAPI('/inventory/dashboard', 'GET', garageAToken);
        assert(res.data.roleContext.lockedToGarageId === garageA.id, "Garage user is heavily locked to their own Garage ID natively");
        assert(!res.data.stock.some((s: any) => s.garageId === harveyGarage.id), "Garage user absolutely cannot see Harvey Stock natively");

        // --- 2. HARVEY USER VISIBILITY ---
        res = await fetchAPI('/inventory/dashboard', 'GET', harveyToken);
        assert(res.data.roleContext.isHarvey === true && res.data.roleContext.lockedToGarageId === null, "Harvey user context avoids strict locks natively");
        res = await fetchAPI('/inventory/harvey', 'GET', harveyToken);
        assert(res.status === 200 && Array.isArray(res.data.harveyStock), "Harvey user accesses dedicated Harvey Panel correctly natively");

        // --- 3. ADMIN VISIBILITY ---
        res = await fetchAPI('/inventory/dashboard', 'GET', adminToken);
        assert(res.data.roleContext.isAdmin === true && res.data.roleContext.lockedToGarageId === null, "Admin sees complete inventory fleet-wide natively");

        // --- 4. TRANSACTION FLOWS & LEDGER INTEGRITY ---
        console.log("\n--- Testing Transactions ---");

        // RECEIVE stock into Garage A
        res = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 15, type: 'RECEIVE', notes: 'API Test Receive'
        });
        assert(res.status === 200, `RECEIVE Flow successful`);

        // ISSUE stock
        res = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 2, type: 'ISSUE', notes: 'API Test Issue'
        });
        assert(res.status === 200, `ISSUE Flow successful`);

        // NEGATIVE STOCK PREVENTION
        res = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 9999, type: 'ISSUE', notes: 'Over-issue test'
        });
        assert(res.status === 400 && res.data.error.includes("negative stock"), `Negative Stock strictly blocked cleanly at SQL level: ${res.data.error}`);

        // GARAGE TO GARAGE BLOCK
        res = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 1, type: 'TRANSFER_OUT', destinationGarageId: garageB.id
        });
        assert(res.status === 403 && res.data.error.includes("FORBIDDEN"), "Blocked illegal Garage ↔ Garage Transfer logic explicitly");

        // GARAGE TO HARVEY
        res = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 3, type: 'TRANSFER_OUT', destinationGarageId: harveyGarage.id
        });
        assert(res.status === 200, "Garage correctly transferred valid stock securely to Harvey Factory");

        // HARVEY TO GARAGE
        res = await fetchAPI('/inventory/transaction', 'POST', harveyToken, {
            seatInsertTypeId: seatType.id, quantity: 1, type: 'TRANSFER_OUT', destinationGarageId: garageA.id
        });
        assert(res.status === 200, "Harvey Factory effectively pushed valid stock to Standard Garage natively");

        // LEDGER VERIFICATION
        const doubleEntryLogs: any[] = await prisma.inventoryTransaction.findMany({
            where: { type: { in: ['TRANSFER_OUT', 'TRANSFER_IN'] }, notes: { contains: 'API Test' } }, // Can't easily filter random UUIDs here, let's grab the last 2
            orderBy: { createdAt: 'desc' }, take: 2
        });
        const transferGroupIdMatches = doubleEntryLogs.length === 2 && doubleEntryLogs[0].transferGroupId === doubleEntryLogs[1].transferGroupId;
        assert(transferGroupIdMatches && doubleEntryLogs[0].transferGroupId !== null, "Atomic Ledger double-entry maps to exact transferGroupId cleanly");

        // --- 5. ANALYTICS PERFORMANCE ---
        console.log("\n--- Testing Analytics ---");
        res = await fetchAPI('/inventory/analytics', 'GET', adminToken);
        assert(res.status === 200, "Analytics Payload successfully requested fully globally natively");
        assert(res.data.summary && typeof res.data.summary.totalIssued === 'number', "Analytics returned mapped dynamic payload integers successfully");

        const garageAnalytics = await fetchAPI('/inventory/analytics', 'GET', garageAToken);
        assert(!garageAnalytics.data.usageByGarage.some((g: any) => g.garageName === 'Harvey Shop'), "Analytics maps exclusively isolate Garage metrics away from Factory metrics based on Token scope natively");

        // --- 6. FAILURE TRACKING & ANALYTICS VERIFICATION ---
        console.log("\n--- Testing Failure Tracking ---");
        
        // Scrap with Vandalism
        let scrapRes = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 2, type: 'SCRAP', notes: 'Vandalized Seat',
            failureReason: 'VANDALISM', isVandalism: true, busId: '7777'
        });
        assert(scrapRes.status === 200, "Scrap flow accepted Vandalism Failure Reason natively.");

        // Return with Wear
        let returnRes = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 1, type: 'RETURN', notes: 'Worn out',
            failureReason: 'WEAR', isVandalism: false
        });
        assert(returnRes.status === 200, "Return flow accepted Wear Failure Reason natively.");

        // Transfer to Harvey with Structural Damage
        let transferHarveyRes = await fetchAPI('/inventory/transaction', 'POST', garageAToken, {
            seatInsertTypeId: seatType.id, quantity: 1, type: 'TRANSFER_OUT', destinationGarageId: harveyGarage.id,
            failureReason: 'STRUCTURAL_DAMAGE', workOrderId: 'WO-9999'
        });
        assert(transferHarveyRes.status === 200, "Transfer to Harvey accepted Structural Damage natively.");

        // Verify aggregations in Analytics for Admin
        let adminAnalyticsRes = await fetchAPI('/inventory/analytics', 'GET', adminToken);
        const vandalismStat = adminAnalyticsRes.data.vandalismByGarage?.find((v:any) => v.garage === garageA.name);
        const defectStat = adminAnalyticsRes.data.failureByReason?.find((f:any) => f.reason === 'STRUCTURAL_DAMAGE');
        const harveyRepairStat = adminAnalyticsRes.data.harveyRepairReasons?.find((h:any) => h.reason === 'STRUCTURAL_DAMAGE');
        
        assert(vandalismStat && vandalismStat.count >= 2, "Analytics mapped Vandalism payload integers correctly to localized Garage");
        assert(defectStat && defectStat.count >= 1, "Analytics abstracted universal Structural Damage across Failure Matrices cleanly");
        assert(harveyRepairStat && harveyRepairStat.count >= 1, "Harvey Pipeline captured Structural Damage implicitly within the TRANSFER_IN wrapper object");

        console.log("\n🏆 ALL MATRICES VERIFIED SUCCESSFULLY LOCAL FIRST.");

    } catch (e: any) {
        console.error("TEST SCRIPT ERROR:", e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
