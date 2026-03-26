import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import jwt from 'jsonwebtoken';

async function run() {
    try {
        console.log("=== Phase 16 E2E Verification ===");
        const filePath = 'C:\\Users\\samss\\Downloads\\Bus Allocation march 24.xls';
        if (!fs.existsSync(filePath)) {
            console.error("File not found at", filePath);
            return;
        }

        console.log("\\n--- 0. AUTHENTICATION ---");
        const token = jwt.sign({ userId: 'system', role: 'ADMIN' }, 'change-me');
        console.log("Synthesized local JWT Bearer token!");

        const form = new FormData();
        // Force mapped columns for XLS file where 'Vehicle' is fleet number and 'Location' is garage. Text fields must precede files for Multer!
        form.append('columnMapping', JSON.stringify({ fleetNumber: 'Vehicle', garage: 'Location' }));

        form.append('file', fs.createReadStream(filePath), {
            filename: 'Bus Allocation march 24.xls',
            contentType: 'application/vnd.ms-excel'
        });

        console.log("\\n--- 1. PREVIEW TEST ---");
        const res = await axios.post('http://127.0.0.1:4000/api/buses/import/allocation/preview', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Total Rows:", res.data.totalRows);
        console.log("Valid Rows:", res.data.validRows);
        console.log("Error Rows:", res.data.errorRows);
        console.log("Duplicate Rows:", res.data.duplicateRows);
        console.log("Detected Headers:", res.data.detectedHeaders);
        console.log("Mapped Headers:", res.data.mappedHeaders);
        
        console.log("\\nFirst 10 Preview Rows:");
        res.data.rows.slice(0, 10).forEach((r, i) => {
            console.log(`[Row ${r.rowNumber}] Action: ${r.action} | Fleet: ${r.data.fleetNumber} | Garage: ${r.data.garageName} | Valid: ${r.isValid} | Errors:`, r.errors);
        });

        console.log("\\n--- 2. COMMIT DRY-RUN AUDIT ---");
        console.log("Will commit", res.data.validRows, "valid rows...");

        const commitForm = {
            filename: "Bus Allocation march 24.xls",
            rows: res.data.rows
        };

        console.log("\\n--- 3. COMMIT VERIFICATION ---");
        const commitRes = await axios.post('http://127.0.0.1:4000/api/buses/import/allocation/commit', commitForm, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Commit Result:", commitRes.data);
    } catch (e) {
        if (e.response) {
            console.error("API Error:", e.response.status);
            fs.writeFileSync('api_out.json', JSON.stringify(e.response.data, null, 2));
            console.log("Wrote response to api_out.json");
        } else {
            console.error("Network Error:", e.message);
        }
    }
}

run();
