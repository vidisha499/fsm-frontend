const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType } = require("docx");

const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "E0E0E0" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "E0E0E0" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "E0E0E0" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "E0E0E0" }
};

function createCell(text, bold = false, size = 20, color = "000000", isHeader = false) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text, bold, size, color })],
            alignment: AlignmentType.LEFT
        })],
        shading: isHeader ? { fill: "F5F5F5" } : undefined,
        borders: cellBorders,
        margins: { top: 120, bottom: 120, left: 150, right: 150 }
    });
}

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // Title
            new Paragraph({
                children: [
                    new TextRun({
                        text: "PugArch Forest Staff Management (FSM)",
                        bold: true,
                        size: 32,
                        color: "2E7D32"
                    })
                ],
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Simple Project Specifications: Site & Beat Assignment System",
                        bold: true,
                        size: 20,
                        color: "37474F"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
            }),

            // Metadata info
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            createCell("Document Version", true, 20, "000000", true),
                            createCell("v1.4 (Simple Edition)", false),
                            createCell("Author", true, 20, "000000", true),
                            createCell("PugArch FSM Team", false)
                        ]
                    }),
                    new TableRow({
                        children: [
                            createCell("Target System", true, 20, "000000", true),
                            createCell("Mobile Web Application & REST APIs", false),
                            createCell("Date", true, 20, "000000", true),
                            createCell("June 2, 2026", false)
                        ]
                    })
                ]
            }),

            new Paragraph({ text: "", spacing: { after: 200 } }),

            // Section 1: Objective
            new Paragraph({
                text: "1. Project Objective",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 150, after: 100 }
            }),
            new Paragraph({
                text: "The Site & Beat Assignment module allows administrators to map employees, supervisors, and admins to specific work locations. This controls where employees can mark attendance and what data they can see on their dashboards.",
                spacing: { after: 150 }
            }),

            // Section 2: Flow 1
            new Paragraph({
                text: "2. Single Employee Assignment Flow",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 150, after: 100 }
            }),
            new Paragraph({
                text: "This flow is used when assigning a site to a single employee from their profile page:",
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Auto-Fill Current Site: ", bold: true }),
                    new TextRun({ text: "The app fetches the user's active site from the database and automatically pre-selects the Range, Beat, and Geofence fields." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Name Lock: ", bold: true }),
                    new TextRun({ text: "The employee's name field is pre-selected and locked (cannot be edited) to avoid mistakes." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Date Overlap Check: ", bold: true }),
                    new TextRun({ text: "The system checks if the new assignment dates conflict with old ones. It shows a warning if dates overlap, letting you replace or archive the old assignment." })
                ],
                spacing: { after: 150 }
            }),

            // Section 3: Flow 2
            new Paragraph({
                text: "3. Bulk & Role-Based Assignment Flow",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 150, after: 100 }
            }),
            new Paragraph({
                text: "This flow is used when assigning sites to multiple users from the directory lists. The dropdowns change depending on the user's role:",
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "A. Supervisors (Multi-Beat Mode): ", bold: true, color: "2E7D32" }),
                    new TextRun({ text: "Supervisors can manage multiple beats. The admin must select one Range, which enables a multi-select list of Beats. The admin can check multiple beats. The Geofence field is hidden. If the Range is changed, the selected Beats are cleared automatically." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "B. Admins (Multi-Range Mode): ", bold: true, color: "2E7D32" }),
                    new TextRun({ text: "Admins manage whole divisions. The Beat and Geofence dropdowns are hidden. The Range dropdown becomes multi-select, allowing the admin to assign multiple Ranges to the Admin user at the same time." })
                ],
                spacing: { after: 150 }
            }),

            // Section 4: Unassigned
            new Paragraph({
                text: "4. Assignment for Unassigned Users",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 150, after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Blank Slate: ", bold: true }),
                    new TextRun({ text: "All dropdowns show 'Select Range', 'Select Beat', etc." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Step-by-Step Selection: ", bold: true }),
                    new TextRun({ text: "Fields unlock one by one. Selecting a Range unlocks the Beats dropdown. Selecting a Beat unlocks the Geofence dropdown." })
                ],
                spacing: { after: 150 }
            }),

            // Section 5: Matrix
            new Paragraph({
                text: "5. UI Input Matrix for Roles",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 150, after: 100 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            createCell("User Role", true, 20, "000000", true),
                            createCell("Employee Field", true, 20, "000000", true),
                            createCell("Range Selector", true, 20, "000000", true),
                            createCell("Beat Selector", true, 20, "000000", true),
                            createCell("Geofence Selector", true, 20, "000000", true)
                        ]
                    }),
                    new TableRow({
                        children: [
                            createCell("Guard / Employee"),
                            createCell("Locked Name"),
                            createCell("Single Range"),
                            createCell("Single Beat"),
                            createCell("Single Geofence")
                        ]
                    }),
                    new TableRow({
                        children: [
                            createCell("Supervisor"),
                            createCell("Multi-select List"),
                            createCell("Single Range"),
                            createCell("Multi-select Beats"),
                            createCell("Hidden (Not applicable)")
                        ]
                    }),
                    new TableRow({
                        children: [
                            createCell("Admin"),
                            createCell("Multi-select List"),
                            createCell("Multi-select Ranges"),
                            createCell("Hidden (Not applicable)"),
                            createCell("Hidden (Not applicable)")
                        ]
                    })
                ]
            }),

            new Paragraph({ text: "", spacing: { after: 200 } }),

            // Section 6: Edge cases
            new Paragraph({
                text: "6. System Edge Cases & Solutions",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 150, after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Changing Assignments Mid-Shift: ", bold: true }),
                    new TextRun({ text: "If an admin changes a guard's site while they are already checked-in, their active shift runs normally. The new assignment starts on their next check-in shift." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Offline Sync: ", bold: true }),
                    new TextRun({ text: "If a guard is in a forest zone with no network, the app uses cached boundaries to log attendance. It syncs the data back to the server once internet is available." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Deleting a Location: ", bold: true }),
                    new TextRun({ text: "If a Beat/Site is deleted from the admin configurations, all active staff assignments to that Beat are automatically deactivated and archived in the history logs." })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "• Overlapping Geofences: ", bold: true }),
                    new TextRun({ text: "If a guard is inside overlapping zones, the system matches their attendance to their assigned Beat. If assigned to both, it selects the closest one based on GPS." })
                ],
                spacing: { after: 150 }
            })
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    const docPath = path.join(__dirname, "FSM_Site_Assignment_Specifications_Simple.docx");
    fs.writeFileSync(docPath, buffer);
    console.log("SUCCESS: Simple Word document created successfully at " + docPath);
}).catch(err => {
    console.error("ERROR generating simple word doc:", err);
    process.exit(1);
});
