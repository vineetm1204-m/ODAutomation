let subjectCount = 0
let studentCount = 0
let timetableData = []

function showToast(message, type = "success") {
  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.innerHTML = `
    <i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i>
    <span>${message}</span>
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.classList.add("show"), 100)
  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 3000)
}

// Timetable upload functionality
document.getElementById("timetableFile").addEventListener("change", handleTimetableUpload)

// Drag and drop functionality
const uploadArea = document.querySelector(".timetable-upload")
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault()
  uploadArea.classList.add("dragover")
})

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover")
})

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault()
  uploadArea.classList.remove("dragover")
  const files = e.dataTransfer.files
  if (files.length > 0) {
    handleTimetableFile(files[0])
  }
})

async function handleTimetableUpload(event) {
  const file = event.target.files[0]
  if (file) {
    handleTimetableFile(file)
  }
}

async function handleTimetableFile(file) {
  try {
    const text = await file.text()
    const lines = text.split("\n")
    timetableData = []

    // Parse CSV format: Day,Time,Subject,Faculty
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        const [day, time, subject, faculty] = line.split(",").map((item) => item.trim())
        if (day && time && subject && faculty) {
          timetableData.push({ day, time, subject, faculty })
        }
      }
    }

    if (timetableData.length > 0) {
      document.getElementById("timetableControls").style.display = "block"
      document.getElementById("timetableStatus").textContent =
        `Timetable loaded successfully! Found ${timetableData.length} entries.`
      showToast(`Timetable uploaded successfully! Loaded ${timetableData.length} entries.`)
    } else {
      showToast("No valid entries found in the timetable file.", "error")
    }
  } catch (error) {
    showToast("Error reading timetable file. Please check the format.", "error")
  }
}

function autoFillFromTimetable() {
  const selectedDay = document.getElementById("daySelect").value
  const selectedTime = document.getElementById("timeSelect").value

  if (!selectedDay || !selectedTime) {
    showToast("Please select both day and time.", "error")
    return
  }

  const matchingEntries = timetableData.filter((entry) => entry.day === selectedDay && entry.time === selectedTime)

  if (matchingEntries.length === 0) {
    showToast("No matching entries found for the selected day and time.", "error")
    return
  }

  // Clear existing subjects
  document.getElementById("subjectsContainer").innerHTML = ""
  subjectCount = 0
  studentCount = 0

  // Add subjects from timetable
  matchingEntries.forEach((entry) => {
    addSubject()
    const currentSubject = document.getElementById(`subject-${subjectCount}`)
    currentSubject.querySelector(".subject").value = entry.subject
    currentSubject.querySelector(".faculty").value = entry.faculty
    currentSubject.querySelector(".time").value = entry.time
  })

  showToast(`Auto-filled ${matchingEntries.length} subjects from timetable!`)
}

function addSubject() {
  subjectCount++
  const container = document.getElementById("subjectsContainer")
  const div = document.createElement("div")
  div.className = "subject-card fade-in"
  div.id = `subject-${subjectCount}`
  div.innerHTML = `
    <div class="subject-header">
      <div class="subject-title">
        <i class="fas fa-book"></i>
        Subject ${subjectCount}
      </div>
    </div>
    <button class="btn btn-danger btn-icon remove-subject-btn" onclick="removeSubject(${subjectCount})" title="Remove Subject">
      <i class="fas fa-times"></i>
    </button>
    
    <div class="form-grid">
      <div class="form-group">
        <label>
          <i class="fas fa-code"></i> Subject (Code - Name)
        </label>
        <input type="text" class="subject" placeholder="Code - Name">
      </div>
      
      <div class="form-group">
        <label>
          <i class="fas fa-chalkboard-teacher"></i> Faculty Name & Code
        </label>
        <input type="text" class="faculty" placeholder="Name [Code]">
      </div>
      
      <div class="form-group full-width">
        <label>
          <i class="fas fa-clock"></i> Time Slot
        </label>
        <select class="time">
          <option value="">Choose time</option>
          <option value="09:15 AM - 10:10 AM">09:15 AM - 10:10 AM</option>
          <option value="10:15 AM - 11:10 AM">10:15 AM - 11:10 AM</option>
          <option value="11:15 AM - 12:10 PM">11:15 AM - 12:10 PM</option>
          <option value="12:15 AM - 01:10 PM">12:15 AM - 01:10 PM</option>
          <option value="01:15 AM - 02:10 PM">01:15 AM - 02:10 PM</option>
          <option value="02:15 PM - 03:10 PM">02:15 PM - 03:10 PM</option>
          <option value="03:15 PM - 04:10 PM">03:15 PM - 04:10 PM</option>
          <option value="04:15 PM - 05:10 PM">04:15 PM - 05:10 PM</option>
        </select>
      </div>
    </div>
    
    <div class="student-section">
      <label>
        <i class="fas fa-users"></i> Students
      </label>
      <div class="student-list" id="student-list-${subjectCount}">
      </div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="addStudent(${subjectCount})">
        <i class="fas fa-user-plus"></i> Add Student
      </button>
    </div>
  `
  container.appendChild(div)
  addStudent(subjectCount) // Add one student input by default
}

function removeSubject(id) {
  const block = document.getElementById(`subject-${id}`)
  if (block) {
    block.style.animation = "fadeOut 0.3s ease"
    setTimeout(() => block.remove(), 300)
  }
}

function addStudent(subjectId) {
  studentCount++
  const list = document.getElementById(`student-list-${subjectId}`)
  const div = document.createElement("div")
  div.className = "student-item slide-in"
  div.id = `student-input-${studentCount}`
  div.innerHTML = `
    <input type="text" placeholder="Student Name" class="student-name">
    <button type="button" class="btn btn-danger btn-sm" onclick="removeStudent(${studentCount})" title="Remove Student">
      <i class="fas fa-user-minus"></i>
    </button>
  `
  list.appendChild(div)
}

function removeStudent(studentId) {
  const studentInput = document.getElementById(`student-input-${studentId}`)
  if (studentInput) {
    studentInput.style.animation = "fadeOut 0.3s ease"
    setTimeout(() => studentInput.remove(), 300)
  }
}

function generateMail() {
  const coordinator = document.getElementById("coordinator").value.trim()
  const date = document.getElementById("date").value
  const classSection = document.getElementById("classSection").value.trim()
  const subjects = document.querySelectorAll(".subject-card")

  if (!coordinator || !date || !classSection) {
    showToast("Please fill in all required fields", "error")
    return
  }

  let subjectDetails = ""
  let hasValidSubject = false

  subjects.forEach((block, index) => {
    const sub = block.querySelector(".subject").value.trim()
    const faculty = block.querySelector(".faculty").value.trim()
    const time = block.querySelector(".time").value.trim()

    if (sub && faculty && time) {
      hasValidSubject = true
      subjectDetails += `${index + 1}. Subject: ${sub}\n   Faculty: ${faculty}\n   Time: ${time}\n`

      const students = block.querySelectorAll(".student-name")
      const studentList = []
      students.forEach((studentInput) => {
        const name = studentInput.value.trim()
        if (name) {
          studentList.push(name)
        }
      })

      if (studentList.length > 0) {
        subjectDetails += `   Students: ${studentList.join(", ")}\n`
      }
      subjectDetails += `\n`
    }
  })

  if (!hasValidSubject) {
    showToast("Please add at least one complete subject", "error")
    return
  }

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

  document.getElementById("output").value = email
  showToast("Email generated successfully!")
}

async function copyText() {
  const text = document.getElementById("output")
  const content = text.value

  if (!content.trim()) {
    showToast("Please generate an email first", "error")
    return
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content)
      showToast("Email copied to clipboard!")
    } else {
      // Fallback for older browsers
      text.select()
      text.setSelectionRange(0, 99999)
      document.execCommand("copy")
      showToast("Email copied to clipboard!")
    }
  } catch (err) {
    showToast("Failed to copy email", "error")
  }
}

// Initialize with one subject block
window.addEventListener("load", () => {
  addSubject()
})

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "Enter":
        e.preventDefault()
        generateMail()
        break
      case "n":
        e.preventDefault()
        addSubject()
        break
    }
  }
})
