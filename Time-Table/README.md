# RPSIT Timetable Studio

This is a browser-based timetable generator for R P Sarathy Institute of Technology.

## Run

Serve this folder with any static web server, then open `index.html`. For example:

```powershell
python -m http.server 4173
```

Open `http://localhost:4173` and upload an `.xlsx` workbook. The app supports the canonical fields `Teacher Name`, `Subject Name`, `Subject Code`, `Class Name`, and `Periods Required`, plus the supplied section-marker workbook format where a class label such as `AIDS` precedes the subject table.

Click `Generate`, select a class, and use `Export PDF`. The export uses browser print-to-PDF so the native PDF dialog controls the final save location. The live UI remains logo-free; the RPSIT logo appears only on the print document.

Before generating, configure fixed periods in the subject-classification panel. Labs use one manually selected continuous block and can be assigned before or after lunch. Placement and Library subjects can use either one continuous block or individually selected periods on different days. These reservations are preserved during regeneration, and remaining theory subjects are scheduled around them. The timetable grid's manual-edit mode provides a second way to adjust the same fixed reservations.

## Tests

```powershell
npm test
```
