// DOM Elements
const modeEl = document.getElementById("mode")
const statusEl = document.getElementById("status")
const anglesEl = document.getElementById("angles")
const statusIndicator = document.getElementById("statusIndicator")
const permissionGate = document.getElementById("permissionGate")
const enableBtn = document.getElementById("enableMotion")

// Views
const views = {
  upright: document.getElementById("alarm"),
  upside: document.getElementById("timer"),
  landLeft: document.getElementById("stopwatch"),
  landRight: document.getElementById("weather"),
}

// Orientation Detection
function showView(key) {
  Object.values(views).forEach((v) => v.classList.remove("active"))
  views[key].classList.add("active")
}

function labelFor(key) {
  const labels = {
    upright: "Portrait Upright · Alarm Clock",
    upside: "Portrait Upside Down · Timer",
    landLeft: "Landscape Left · Stopwatch",
    landRight: "Landscape Right · Weather",
  }
  return labels[key] || "Detecting..."
}

function layoutFrom(beta, gamma) {
  if (beta > 45 && beta < 135) return "upright"
  if (beta < -45 && beta > -135) return "upside"
  if (gamma < -45) return "landLeft"
  if (gamma > 45) return "landRight"
  return "upright"
}

function updateModeFromAngles(alpha, beta, gamma) {
  const key = layoutFrom(beta, gamma)
  modeEl.textContent = labelFor(key)
  showView(key)
  anglesEl.textContent = `α ${Math.round(alpha || 0)}° · β ${Math.round(beta || 0)}° · γ ${Math.round(gamma || 0)}°`
  statusEl.textContent = "Live Motion"
  statusIndicator.style.background = "var(--success)"
}

function fallbackFromScreenOrientation() {
  let type = ""
  if (screen.orientation && screen.orientation.type) {
    type = screen.orientation.type
  }
  if (type.includes("portrait")) {
    updateModeFromAngles(0, 90, 0)
  } else if (type.includes("landscape")) {
    updateModeFromAngles(0, 0, 90)
  }
}

function startMotion() {
  if (window.DeviceOrientationEvent) {
    window.addEventListener(
      "deviceorientation",
      (e) => {
        updateModeFromAngles(e.alpha, e.beta, e.gamma)
      },
      true,
    )
    statusEl.textContent = "Listening..."
  } else {
    statusEl.textContent = "Motion not supported"
    statusIndicator.style.background = "var(--warning)"
    fallbackFromScreenOrientation()
  }
}

function setupIOSPermissionGate() {
  const needsPermission =
    typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"

  if (needsPermission) {
    permissionGate.classList.remove("hidden")
    enableBtn.onclick = async () => {
      try {
        const response = await DeviceOrientationEvent.requestPermission()
        if (response === "granted") {
          permissionGate.classList.add("hidden")
          startMotion()
        }
      } catch (error) {
        console.error("Permission request failed:", error)
      }
    }
  } else {
    startMotion()
  }
}

// Audio System
const AudioContext = window.AudioContext || window.webkitAudioContext
let audioContext

function beep(duration = 1200, frequency = 880) {
  if (!audioContext) audioContext = new AudioContext()

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.start()

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.4, audioContext.currentTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration / 1000)

  oscillator.stop(audioContext.currentTime + duration / 1000)
}

// Alarm Clock
const clockNow = document.getElementById("clockNow")
const currentDate = document.getElementById("currentDate")
const alarmTime = document.getElementById("alarmTime")
const setAlarmBtn = document.getElementById("setAlarm")
const clearAlarmBtn = document.getElementById("clearAlarm")
const testBeepBtn = document.getElementById("testBeep")
const alarmHint = document.getElementById("alarmHint")

let alarmAt = null

function updateClock() {
  const now = new Date()
  const timeString = now.toLocaleTimeString("en-US", { hour12: false })
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  clockNow.textContent = timeString
  currentDate.textContent = dateString

  if (alarmAt && now >= alarmAt) {
    alarmHint.textContent = "🔔 Alarm Ringing!"
    alarmHint.style.color = "var(--danger)"
    beep(1500, 1000)
    alarmAt = null
    setTimeout(() => {
      alarmHint.textContent = "No alarm set"
      alarmHint.style.color = "var(--text-secondary)"
    }, 3000)
  }
}

setInterval(updateClock, 1000)
updateClock()

setAlarmBtn.onclick = () => {
  const timeValue = alarmTime.value
  if (!timeValue) {
    alarmHint.textContent = "Please set a time first"
    alarmHint.style.color = "var(--warning)"
    return
  }

  const [hours, minutes] = timeValue.split(":").map((n) => Number.parseInt(n, 10))
  const now = new Date()
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)

  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }

  alarmAt = target
  const timeString = target.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  alarmHint.textContent = `⏰ Alarm set for ${timeString}`
  alarmHint.style.color = "var(--success)"
}

clearAlarmBtn.onclick = () => {
  alarmAt = null
  alarmHint.textContent = "No alarm set"
  alarmHint.style.color = "var(--text-secondary)"
}

testBeepBtn.onclick = () => beep()

// Timer
const timerMin = document.getElementById("timerMin")
const timerSec = document.getElementById("timerSec")
const timerDisplay = document.getElementById("timerDisplay")
const timerStart = document.getElementById("timerStart")
const timerPause = document.getElementById("timerPause")
const timerReset = document.getElementById("timerReset")

let timerRemaining = 0
let timerInterval = null
let timerPaused = false
let timerEndTime = 0

function formatTimer(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTimer(timerRemaining)
}

function tickTimer() {
  const now = performance.now()
  timerRemaining = Math.max(0, timerEndTime - now)
  updateTimerDisplay()

  if (timerRemaining <= 0) {
    stopTimer()
    beep(1800, 900)
    timerDisplay.style.color = "var(--danger)"
    setTimeout(() => {
      timerDisplay.style.color = "var(--warning)"
    }, 3000)
  }
}

function startTimer() {
  if (timerInterval) return

  if (timerRemaining <= 0) {
    const minutes = Number.parseInt(timerMin.value || "0", 10)
    const seconds = Number.parseInt(timerSec.value || "0", 10)
    timerRemaining = (Math.max(0, minutes) * 60 + Math.max(0, Math.min(59, seconds))) * 1000
  }

  if (timerRemaining <= 0) return

  timerEndTime = performance.now() + timerRemaining
  timerInterval = setInterval(tickTimer, 100)
  timerPaused = false

  timerStart.innerHTML = '<i class="fas fa-play"></i> Running...'
  timerPause.innerHTML = '<i class="fas fa-pause"></i> Pause'
}

function pauseTimer() {
  if (!timerInterval) return

  clearInterval(timerInterval)
  timerInterval = null
  timerPaused = true

  timerStart.innerHTML = '<i class="fas fa-play"></i> Resume'
  timerPause.innerHTML = '<i class="fas fa-pause"></i> Paused'
}

function stopTimer() {
  clearInterval(timerInterval)
  timerInterval = null
  timerPaused = false
  timerRemaining = 0
  updateTimerDisplay()

  timerStart.innerHTML = '<i class="fas fa-play"></i> Start'
  timerPause.innerHTML = '<i class="fas fa-pause"></i> Pause'
}

timerStart.onclick = startTimer
timerPause.onclick = () => {
  if (timerPaused) startTimer()
  else pauseTimer()
}
timerReset.onclick = stopTimer

// Stopwatch
const swDisplay = document.getElementById("swDisplay")
const swStart = document.getElementById("swStart")
const swStop = document.getElementById("swStop")
const swReset = document.getElementById("swReset")
const swLap = document.getElementById("swLap")
const lapsContainer = document.getElementById("laps")

let swRunning = false
let swStartTime = 0
let swElapsed = 0
let swAnimationFrame = 0
let lapTimes = []

function formatStopwatch(milliseconds) {
  const totalMs = Math.floor(milliseconds)
  const minutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const ms = String(totalMs % 1000).padStart(3, "0")
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${ms}`
}

function updateStopwatch() {
  if (!swRunning) return

  const now = performance.now()
  swElapsed = now - swStartTime
  swDisplay.textContent = formatStopwatch(swElapsed)
  swAnimationFrame = requestAnimationFrame(updateStopwatch)
}

swStart.onclick = () => {
  if (swRunning) return

  swRunning = true
  swStartTime = performance.now() - swElapsed
  swAnimationFrame = requestAnimationFrame(updateStopwatch)

  swStart.innerHTML = '<i class="fas fa-play"></i> Running...'
  swStart.disabled = true
}

swStop.onclick = () => {
  if (!swRunning) return

  swRunning = false
  cancelAnimationFrame(swAnimationFrame)

  swStart.innerHTML = '<i class="fas fa-play"></i> Start'
  swStart.disabled = false
}

swReset.onclick = () => {
  swRunning = false
  cancelAnimationFrame(swAnimationFrame)
  swElapsed = 0
  swDisplay.textContent = formatStopwatch(0)
  lapTimes = []
  lapsContainer.textContent = "No laps recorded"

  swStart.innerHTML = '<i class="fas fa-play"></i> Start'
  swStart.disabled = false
}

swLap.onclick = () => {
  if (!swRunning) return

  lapTimes.push(swElapsed)
  const lapList = lapTimes.slice(-10).map((time, index) => {
    const lapNumber = lapTimes.length - (lapTimes.slice(-10).length - 1 - index)
    return `Lap ${lapNumber}: ${formatStopwatch(time)}`
  })
  lapsContainer.innerHTML = lapList.join("<br>")
}

// Weather
const wxTemp = document.getElementById("wxTemp")
const wxDesc = document.getElementById("wxDesc")
const wxMeta = document.getElementById("wxMeta")
const weatherIcon = document.getElementById("weatherIcon")
const getWeatherBtn = document.getElementById("getWeather")
const useGPSBtn = document.getElementById("useGPS")
const cityInput = document.getElementById("city")
const pincodeInput = document.getElementById("pincode")

function getWeatherIcon(code) {
  const iconMap = {
    0: "fas fa-sun",
    1: "fas fa-sun",
    2: "fas fa-cloud-sun",
    3: "fas fa-cloud",
    45: "fas fa-smog",
    48: "fas fa-smog",
    51: "fas fa-cloud-drizzle",
    53: "fas fa-cloud-rain",
    55: "fas fa-cloud-showers-heavy",
    61: "fas fa-cloud-rain",
    63: "fas fa-cloud-rain",
    65: "fas fa-cloud-showers-heavy",
    71: "fas fa-snowflake",
    73: "fas fa-snowflake",
    75: "fas fa-snowflake",
    95: "fas fa-bolt",
  }
  return iconMap[code] || "fas fa-cloud"
}

function weatherCodeToText(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  }
  return descriptions[code] || "Unknown weather"
}

async function fetchWeather(lat, lon, locationName = "") {
  wxDesc.textContent = "Loading weather data..."
  wxTemp.textContent = "--°C"

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error("Weather API request failed")
    }

    const data = await response.json()
    const temp = Math.round(data.current.temperature_2m)
    const code = data.current.weather_code
    const maxTemp = Math.round(data.daily.temperature_2m_max[0])
    const minTemp = Math.round(data.daily.temperature_2m_min[0])

    wxTemp.textContent = `${temp}°C`
    wxDesc.textContent = weatherCodeToText(code)
    wxMeta.textContent = `${locationName ? locationName + " · " : ""}High ${maxTemp}°C · Low ${minTemp}°C`

    weatherIcon.className = getWeatherIcon(code)
  } catch (error) {
    wxDesc.textContent = "Failed to load weather"
    wxMeta.textContent = "Please try again or check your connection"
    console.error("Weather fetch error:", error)
  }
}

async function geocodeLocation(query) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }

    const data = await response.json()

    if (!data.results || !data.results.length) {
      return null
    }

    const result = data.results[0]
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: `${result.name}${result.country ? ", " + result.country : ""}`,
    }
  } catch (error) {
    console.error("Geocoding error:", error)
    return null
  }
}

// Load Delhi weather by default
async function loadDefaultWeather() {
  const delhi = await geocodeLocation("Delhi, India")
  if (delhi) {
    fetchWeather(delhi.lat, delhi.lon, delhi.name)
  }
}

getWeatherBtn.onclick = async () => {
  const city = cityInput.value.trim()
  const pincode = pincodeInput.value.trim()

  let query = ""
  if (city) {
    query = city
  } else if (pincode) {
    query = `${pincode}, India`
  } else {
    query = "Delhi, India"
  }

  const location = await geocodeLocation(query)
  if (location) {
    fetchWeather(location.lat, location.lon, location.name)
  } else {
    wxDesc.textContent = "Location not found"
    wxMeta.textContent = "Please try a different city or pincode"
  }
}

useGPSBtn.onclick = () => {
  if (!navigator.geolocation) {
    wxDesc.textContent = "GPS not supported"
    wxMeta.textContent = "Please enter a city or pincode manually"
    return
  }

  wxDesc.textContent = "Getting your location..."

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchWeather(position.coords.latitude, position.coords.longitude, "Your Location")
    },
    (error) => {
      wxDesc.textContent = "Location access denied"
      wxMeta.textContent = "Please enter a city or pincode manually"
      console.error("Geolocation error:", error)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
  )
}

// Initialize
if (screen.orientation) {
  screen.orientation.addEventListener("change", fallbackFromScreenOrientation)
}
window.addEventListener("orientationchange", fallbackFromScreenOrientation)

setupIOSPermissionGate()
loadDefaultWeather()

// Set default placeholder for Delhi
cityInput.placeholder = "Delhi"
pincodeInput.placeholder = "110001"
