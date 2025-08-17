const express = require("express")
const multer = require("multer")
const csv = require("csv-parser")
const fs = require("fs")
const path = require("path")
const nodemailer = require("nodemailer")

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

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER || "vineetm1204@gmail.com",
    pass: process.env.EMAIL_PASS || "optelpffytdyocbz", 
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
    ciphers: "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS",
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  debug: true, // Enable debug logs
  logger: true, // Enable logger
})

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email configuration error:", error.message)
    console.log("🔍 Error code:", error.code)
    console.log("💡 Troubleshooting steps:")
    console.log("   1. Ensure App-Specific Password has no spaces: 'optelpffytdyocbz'")
    console.log("   2. Check if 2-Factor Authentication is enabled on Gmail")
    console.log("   3. Verify the App-Specific Password is for 'Mail' application")
    console.log("   4. Check firewall/antivirus blocking port 587")
    console.log("   5. Try using port 465 with secure: true if 587 fails")
  } else {
    console.log("✅ Email server is ready to send messages")
  }
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

app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, body, coordinatorName } = req.body

    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields: to, subject, body" })
    }

    console.log("[v0] Attempting to send email to:", to)
    console.log("[v0] Using email:", process.env.EMAIL_USER || "vineetm1204@gmail.com")

    try {
      await transporter.verify()
      console.log("[v0] SMTP connection verified successfully")
    } catch (verifyError) {
      console.error("[v0] SMTP verification failed:", verifyError.message)
      throw new Error(`SMTP connection failed: ${verifyError.message}`)
    }

    const mailOptions = {
      from: `"ACC Student Coordinator" <${process.env.EMAIL_USER || "vineetm1204@gmail.com"}>`,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    }

    console.log("[v0] Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    })

    const info = await transporter.sendMail(mailOptions)
    console.log("[v0] Email sent successfully:", info.messageId)
    console.log("[v0] Response:", info.response)

    res.json({
      success: true,
      messageId: info.messageId,
      message: "Email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Detailed error sending email:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    })

    let errorMessage = "Failed to send email"
    if (error.code === "EAUTH") {
      errorMessage = "Authentication failed. App-Specific Password may be incorrect or expired."
    } else if (error.code === "ECONNECTION" || error.code === "ENOTFOUND") {
      errorMessage = "Cannot connect to Gmail servers. Check internet connection and firewall."
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = "Connection timed out. Gmail servers may be busy."
    } else if (error.code === "ESOCKET") {
      errorMessage = "Socket error. Network connection interrupted."
    } else if (error.message.includes("Invalid login")) {
      errorMessage = "Invalid credentials. Verify email and App-Specific Password."
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
      code: error.code,
      debug: {
        host: "smtp.gmail.com",
        port: 587,
        user: process.env.EMAIL_USER || "vineetm1204@gmail.com",
      },
    })
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
 
