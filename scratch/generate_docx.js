const fs = require("fs");
const path = require("path");

// We will use standard DOCX module
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } = require("docx");

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: "FSM (Forest Staff Management) - Site Assignment Functional Specifications",
                        bold: true,
                        size: 32,
                        color: "1B5E20"
                    })
                ],
                spacing: { after: 300 }
            }),

            new Paragraph({
                text: "This specifications document details the requirements, UI/UX configurations, and API backend designs for the FSM Site Assignment processes.",
                spacing: { after: 200 }
            }),

            // Section 1
            new Paragraph({
                text: "1. Specific Employee Assignment (Single User Flow)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 120 }
            }),

            new Paragraph({
                text: "This flow is used when an administrator opens a specific employee's profile and clicks '+ Assign to Site'.",
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Pre-filling Current Details: ", bold: true }),
                    new TextRun({ text: "The system makes a backend request (getUserAssignments) to fetch the user's active site/beat and pre-selects the Range, Beat, and Geofence fields in the dropdowns automatically. The Employee field is locked and read-only with the employee's name pre-selected." })
                ],
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Role-Based Constrained Hierarchy: ", bold: true }),
                    new TextRun({ text: "The next assignment is restricted to the level of their existing hierarchy or custom role. If they are assigned to a site, child nodes (like Geofences) can be assigned, but parent nodes (Clients) cannot be changed unless updated or removed." })
                ],
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Dynamic Cascade: ", bold: true }),
                    new TextRun({ text: "Selecting a parent node (e.g., Range) dynamically clears subsequent dropdowns and loads only the matching child entities from the database." })
                ],
                spacing: { after: 200 }
            }),

            // Section 2
            new Paragraph({
                text: "2. Bulk & Role-Specific Assignment (Bulk User Mode)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 120 }
            }),

            new Paragraph({
                text: "This flow is triggered from the user listing screen using an 'Add Site' button located in the specific role's tab.",
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Supervisor-Specific Flow: ", bold: true }),
                    new TextRun({ text: "When clicking 'Add Site' from the Supervisors list, the page filters the employee selection to show ONLY supervisors. Supervisors are responsible for multiple locations. Therefore, selecting a Range dynamically enables a Multi-Select Beat checkbox/chip list. The supervisor can be assigned multiple beats simultaneously." })
                ],
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Admin-Specific Flow: ", bold: true }),
                    new TextRun({ text: "When assigning an Admin, they should only select a Range. Dropdowns for Beat and Geofence are hidden or disabled, granting them global visibility over all beats under the selected Range." })
                ],
                spacing: { after: 200 }
            }),

            // Section 3
            new Paragraph({
                text: "3. Handling Unassigned Users ('Blank Slate')",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 120 }
            }),

            new Paragraph({
                text: "For a user with no previous site assignment ('No Site Assigned' status):",
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Clean Dropdowns: ", bold: true }),
                    new TextRun({ text: "All hierarchy levels default to 'Select range', 'Select beat', etc." })
                ],
                spacing: { after: 120 }
            }),

            new Paragraph({
                children: [
                    new TextRun({ text: "• Role-Based Adaption: ", bold: true }),
                    new TextRun({ text: "The dropdown behaviors adapt based on the user's role (multi-select beats for unassigned supervisors, single range for admins, single beat for employees)." })
                ],
                spacing: { after: 200 }
            }),

            // Section 4
            new Paragraph({
                text: "4. UI Options & Layout Design",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 120 }
            }),

            new Paragraph({
                text: "• Place the 'Add Site' button in the headers of the specific tabs (Supervisors / Admins) on the User Management list view.",
                spacing: { after: 120 }
            }),

            new Paragraph({
                text: "• Use checkboxes or chip badges for the Multi-Select beats in the Supervisor assignment screen to maintain mobile responsiveness.",
                spacing: { after: 200 }
            })
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    const docPath = path.join(__dirname, "FSM_Site_Assignment_Specifications.docx");
    fs.writeFileSync(docPath, buffer);
    console.log("SUCCESS: Word document created successfully at " + docPath);
}).catch(err => {
    console.error("ERROR generating word doc:", err);
    process.exit(1);
});
