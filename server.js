const express = require("express")
const multer = require("multer")
const csv = require("csv-parser")
const fs = require("fs")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 3000

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  },
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true)
    } else {
      cb(new Error("Only CSV files are allowed!"), false)
    }
  },
})

// Middleware
app.use(express.static("public"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// API endpoint to handle timetable upload
app.post("/api/upload-timetable", upload.single("timetable"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" })
  }

  const results = []
  const filePath = req.file.path

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => {
      // Assuming CSV format: Day,Time,Subject,Faculty
      if (data.Day && data.Time && data.Subject && data.Faculty) {
        results.push({
          day: data.Day.trim(),
          time: data.Time.trim(),
          subject: data.Subject.trim(),
          faculty: data.Faculty.trim(),
        })
      }
    })
    .on("end", () => {
      // Clean up uploaded file
      fs.unlinkSync(filePath)

      res.json({
        success: true,
        data: results,
        count: results.length,
      })
    })
    .on("error", (error) => {
      console.error("Error parsing CSV:", error)
      res.status(500).json({ error: "Error parsing CSV file" })
    })
})

// API endpoint to generate email
app.post("/api/generate-email", (req, res) => {
  try {
    const { coordinator, date, classSection, subjects } = req.body

    if (!coordinator || !date || !classSection || !subjects || subjects.length === 0) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    let subjectDetails = ""
    subjects.forEach((subject, index) => {
      if (subject.name && subject.faculty && subject.time) {
        subjectDetails += `${index + 1}. Subject: ${subject.name}\n   Faculty: ${subject.faculty}\n   Time: ${subject.time}\n`

        if (subject.students && subject.students.length > 0) {
          subjectDetails += `   Students: ${subject.students.join(", ")}\n`
        }
        subjectDetails += `\n`
      }
    })

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const email = `Subject: Request for OD Approval – ${formattedDate}

Respected ${coordinator},

I hope this email finds you in good health and spirits.

I am writing to formally request On-Duty (OD) approval for the following academic session(s) scheduled on ${formattedDate} for ${classSection}:

${subjectDetails}I kindly request your approval for the above-mentioned student(s) to be marked as On-Duty for the specified time slots. This will ensure their attendance is not adversely affected due to their participation in the scheduled event/activity.

Thank you for your time and consideration. I look forward to your positive response.

Best regards,
ACC Student Coordinator

${new Date().toLocaleString()}`

    res.json({
      success: true,
      email: email,
    })
  } catch (error) {
    console.error("Error generating email:", error)
    res.status(500).json({ error: "Error generating email" })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large" })
    }
  }
  res.status(500).json({ error: error.message })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
