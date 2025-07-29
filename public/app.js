// Enhanced client-side JavaScript for Node.js version
class ODMailGenerator {
  constructor() {
    this.subjectCount = 0
    this.studentCount = 0
    this.timetableData = []
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.addSubject() // Initialize with one subject
  }

  setupEventListeners() {
    // Timetable upload
    document.getElementById("timetableFile").addEventListener("change", (e) => {
      this.handleTimetableUpload(e)
    })

    // Drag and drop
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
        this.uploadTimetableToServer(files[0])
      }
    })

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "Enter":
            e.preventDefault()
            this.generateMail()
            break
          case "n":
            e.preventDefault()
            this.addSubject()
            break
        }
      }
    })
  }

  async handleTimetableUpload(event) {
    const file = event.target.files[0]
    if (file) {
      await this.uploadTimetableToServer(file)
    }
  }

  async uploadTimetableToServer(file) {
    const formData = new FormData()
    formData.append("timetable", file)

    try {
      const response = await fetch("/api/upload-timetable", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        this.timetableData = result.data
        document.getElementById("timetableControls").style.display = "block"
        document.getElementById("timetableStatus").textContent =
          `Timetable loaded successfully! Found ${result.count} entries.`
        this.showToast(`Timetable uploaded successfully! Loaded ${result.count} entries.`)
      } else {
        this.showToast(result.error || "Error uploading timetable", "error")
      }
    } catch (error) {
      console.error("Upload error:", error)
      this.showToast("Error uploading timetable file", "error")
    }
  }

  async generateMail() {
    const coordinator = document.getElementById("coordinator").value.trim()
    const date = document.getElementById("date").value
    const classSection = document.getElementById("classSection").value.trim()
    const subjectCards = document.querySelectorAll(".subject-card")

    if (!coordinator || !date || !classSection) {
      this.showToast("Please fill in all required fields", "error")
      return
    }

    const subjects = []
    let hasValidSubject = false

    subjectCards.forEach((block) => {
      const sub = block.querySelector(".subject").value.trim()
      const faculty = block.querySelector(".faculty").value.trim()
      const time = block.querySelector(".time").value.trim()

      if (sub && faculty && time) {
        hasValidSubject = true
        const students = []
        const studentInputs = block.querySelectorAll(".student-name")

        studentInputs.forEach((input) => {
          const name = input.value.trim()
          if (name) students.push(name)
        })

        subjects.push({
          name: sub,
          faculty: faculty,
          time: time,
          students: students,
        })
      }
    })

    if (!hasValidSubject) {
      this.showToast("Please add at least one complete subject", "error")
      return
    }

    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinator,
          date,
          classSection,
          subjects,
        }),
      })

      const result = await response.json()

      if (result.success) {
        document.getElementById("output").value = result.email
        this.showToast("Email generated successfully!")
      } else {
        this.showToast(result.error || "Error generating email", "error")
      }
    } catch (error) {
      console.error("Generation error:", error)
      this.showToast("Error generating email", "error")
    }
  }

  autoFillFromTimetable() {
    const selectedDay = document.getElementById("daySelect").value
    const selectedTime = document.getElementById("timeSelect").value

    if (!selectedDay || !selectedTime) {
      this.showToast("Please select both day and time.", "error")
      return
    }

    const matchingEntries = this.timetableData.filter(
      (entry) => entry.day === selectedDay && entry.time === selectedTime,
    )

    if (matchingEntries.length === 0) {
      this.showToast("No matching entries found for the selected day and time.", "error")
      return
    }

    // Clear existing subjects
    document.getElementById("subjectsContainer").innerHTML = ""
    this.subjectCount = 0
    this.studentCount = 0

    // Add subjects from timetable
    matchingEntries.forEach((entry) => {
      this.addSubject()
      const currentSubject = document.getElementById(`subject-${this.subjectCount}`)
      currentSubject.querySelector(".subject").value = entry.subject
      currentSubject.querySelector(".faculty").value = entry.faculty
      currentSubject.querySelector(".time").value = entry.time
    })

    this.showToast(`Auto-filled ${matchingEntries.length} subjects from timetable!`)
  }

  addSubject() {
    this.subjectCount++
    const container = document.getElementById("subjectsContainer")
    const div = document.createElement("div")
    div.className = "subject-card fade-in"
    div.id = `subject-${this.subjectCount}`
    div.innerHTML = `
      <div class="subject-header">
        <div class="subject-title">
          <i class="fas fa-book"></i>
          Subject ${this.subjectCount}
        </div>
      </div>
      <button class="btn btn-danger btn-icon remove-subject-btn" onclick="odGenerator.removeSubject(${this.subjectCount})" title="Remove Subject">
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
        <div class="student-list" id="student-list-${this.subjectCount}">
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="odGenerator.addStudent(${this.subjectCount})">
          <i class="fas fa-user-plus"></i> Add Student
        </button>
      </div>
    `
    container.appendChild(div)
    this.addStudent(this.subjectCount)
  }

  removeSubject(id) {
    const block = document.getElementById(`subject-${id}`)
    if (block) {
      block.style.animation = "fadeOut 0.3s ease"
      setTimeout(() => block.remove(), 300)
    }
  }

  addStudent(subjectId) {
    this.studentCount++
    const list = document.getElementById(`student-list-${subjectId}`)
    const div = document.createElement("div")
    div.className = "student-item slide-in"
    div.id = `student-input-${this.studentCount}`
    div.innerHTML = `
      <input type="text" placeholder="Student Name" class="student-name">
      <button type="button" class="btn btn-danger btn-sm" onclick="odGenerator.removeStudent(${this.studentCount})" title="Remove Student">
        <i class="fas fa-user-minus"></i>
      </button>
    `
    list.appendChild(div)
  }

  removeStudent(studentId) {
    const studentInput = document.getElementById(`student-input-${studentId}`)
    if (studentInput) {
      studentInput.style.animation = "fadeOut 0.3s ease"
      setTimeout(() => studentInput.remove(), 300)
    }
  }

  async copyText() {
    const text = document.getElementById("output")
    const content = text.value

    if (!content.trim()) {
      this.showToast("Please generate an email first", "error")
      return
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content)
        this.showToast("Email copied to clipboard!")
      } else {
        text.select()
        text.setSelectionRange(0, 99999)
        document.execCommand("copy")
        this.showToast("Email copied to clipboard!")
      }
    } catch (err) {
      this.showToast("Failed to copy email", "error")
    }
  }

  showToast(message, type = "success") {
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
}

// Initialize the application
let odGenerator
window.addEventListener("load", () => {
  odGenerator = new ODMailGenerator()
})

// Global functions for onclick handlers
function addSubject() {
  odGenerator.addSubject()
}

function generateMail() {
  odGenerator.generateMail()
}

function copyText() {
  odGenerator.copyText()
}

function autoFillFromTimetable() {
  odGenerator.autoFillFromTimetable()
}
