import { useState, useEffect, useRef } from "react"
import { openings } from "./data"
import { supabase } from "./supabase"
import "./App.css"

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

function getMedal(index) {
  if (index === 0) return "🥇"
  if (index === 1) return "🥈"
  if (index === 2) return "🥉"
  return `${index + 1}.`
}

function App() {
  const [current, setCurrent] = useState(null)
  const [options, setOptions] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [selected, setSelected] = useState(null)
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [videoEnded, setVideoEnded] = useState(false)
  const [usedOpenings, setUsedOpenings] = useState([])
  const [lives, setLives] = useState(3)
  const [resultMessage, setResultMessage] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [volume, setVolume] = useState(1)

  const [nickname, setNickname] = useState("")
  const [ranking, setRanking] = useState([])
  const [registered, setRegistered] = useState(false)

  const audioRef = useRef(null)
  const videoRef = useRef(null)

  const percentage = (timeLeft / 15) * 100
  let barColor = "#00ffcc"
  if (timeLeft <= 5) barColor = "#ff3b3b"
  else if (timeLeft <= 10) barColor = "#ffd93b"

  useEffect(() => {
    loadRanking()
  }, [])

  async function loadRanking() {
    const { data } = await supabase
      .from("ranking")
      .select("*")
      .order("score", { ascending: false })
      .limit(10)

    if (data) setRanking(data)
  }

  async function saveScore() {
    if (!nickname) return

    await supabase.from("ranking").insert([
      { name: nickname, score: score }
    ])

    loadRanking()
    setRegistered(true)
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    if (videoRef.current) videoRef.current.volume = volume
  }, [volume, current])

  useEffect(() => {
    if (!current || showResult) return

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }

    setTimeLeft(15)

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleAnswer(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [current, showResult])

  useEffect(() => {
    if (showResult && videoEnded && lives > 0 && !gameOver) {
      startRoundSolo()
      setVideoEnded(false)
    }
  }, [showResult, videoEnded, lives, gameOver])

  function startRoundSolo() {
    const availableOpenings = openings.filter(
      o => !usedOpenings.includes(o.anime)
    )

    if (availableOpenings.length === 0) {
      setGameOver(true)
      return
    }

    const randomOpening =
      availableOpenings[Math.floor(Math.random() * availableOpenings.length)]

    const wrongOptions = openings
      .filter(o => o.anime !== randomOpening.anime)
      .map(o => o.anime)

    const allOptions = shuffle([
      randomOpening.anime,
      ...shuffle(wrongOptions).slice(0, 3)
    ])

    setCurrent(randomOpening)
    setOptions(allOptions)
    setSelected(null)
    setShowResult(false)
    setTimeLeft(15)
    setVideoEnded(false)
    setResultMessage("")

    setUsedOpenings(prev => [...prev, randomOpening.anime])
  }

  function handleAnswer(option) {
    if (!current) return

    setSelected(option)

    if (option === null) {
      setLives(prev => prev - 1)
      setResultMessage("⏰ Tempo esgotado!")
    } else if (option === current.anime) {
      setScore(prev => prev + 1)
      setResultMessage("✅ Acertou!")
    } else {
      setLives(prev => prev - 1)
      setResultMessage("❌ Errou!")
    }

    setShowResult(true)

    if (lives <= 1 && option !== current.anime) {
      setTimeout(() => {
        if (score > highScore) setHighScore(score)
        setGameOver(true)
      }, 1500)
    }
  }

  function skipVideo() {
    if (videoRef.current) videoRef.current.pause()
    setVideoEnded(true)
  }

  function resetGame() {
    setScore(0)
    setLives(3)
    setUsedOpenings([])
    setCurrent(null)
    setOptions([])
    setShowResult(false)
    setSelected(null)
    setTimeLeft(15)
    setVideoEnded(false)
    setStarted(false)
    setGameOver(false)
    setResultMessage("")
    setNickname("")
    setRegistered(false)
  }

  if (gameOver) {
    return (
      <div style={{
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center",
        height:"100vh",
        background:"linear-gradient(135deg,#0f0f0f,#1a1a1a)",
        color:"white",
        textAlign:"center"
      }}>
        <h1 style={{fontSize:"4rem",color:"#ff3b3b"}}>💀 GAME OVER 💀</h1>

        <h2>⭐ Pontuação Final: {score}</h2>
        <h2>🏆 Recorde: {highScore}</h2>

        <div style={{
          marginTop:"20px",
          background:"#222",
          padding:"20px",
          borderRadius:"12px",
          width:"260px"
        }}>
          <h3>Registrar Ranking</h3>

          <input
            placeholder="Digite seu nickname"
            value={nickname}
            maxLength={12}
            onChange={(e)=>setNickname(e.target.value)}
            style={{
              padding:"12px",
              width:"100%",
              borderRadius:"8px",
              border:"2px solid #00ffcc",
              background:"#111",
              color:"white",
              textAlign:"center",
              marginTop:"10px"
            }}
          />

          {!registered && (
            <button
              onClick={saveScore}
              style={{
                marginTop:"10px",
                padding:"12px",
                width:"100%",
                background:"#00ffcc",
                border:"none",
                borderRadius:"8px",
                fontWeight:"bold",
                cursor:"pointer"
              }}
            >
              🏆 Registrar
            </button>
          )}
        </div>

        <h2 style={{marginTop:"30px"}}>Top 10</h2>

        {ranking.map((r,i)=>(
          <div key={i} style={{
            display:"flex",
            justifyContent:"space-between",
            width:"220px",
            background:"#1a1a1a",
            padding:"8px 12px",
            borderRadius:"6px",
            margin:"4px 0"
          }}>
            <span>{getMedal(i)} {r.name}</span>
            <span>{r.score}</span>
          </div>
        ))}

        <button
          style={{
            marginTop:"30px",
            padding:"15px 40px",
            fontSize:"18px",
            borderRadius:"10px",
            border:"none",
            cursor:"pointer",
            backgroundColor:"#00ffcc",
            color:"#000",
            fontWeight:"bold"
          }}
          onClick={resetGame}
        >
          🔁 Jogar Novamente
        </button>
      </div>
    )
  }

  if (!started) {
    return (
      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        height:"100vh",
        backgroundColor:"#111",
        color:"white",
        flexDirection:"column"
      }}>
        <h1>What is the Opening</h1>

        <button onClick={() => { setStarted(true); startRoundSolo() }}>
          🎮 Jogar
        </button>

        <h3>🏆 Recorde: {highScore}</h3>

        <h2 style={{marginTop:"40px"}}>Top 10</h2>

        {ranking.map((r,i)=>(
          <div key={i}>
            {getMedal(i)} {r.name} - {r.score}
          </div>
        ))}
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="container">
      <h1 className="title">Qual é o anime?</h1>

      <h2 className="timer">Tempo restante: {timeLeft}s</h2>

      <div className="time-bar-container">
        <div
          className="time-bar"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        ></div>
      </div>

      <h3>⭐ Pontuação: {score}</h3>
      <h3>❤️ Vidas: {lives}</h3>

      <div style={{ margin: "15px 0" }}>
        <label>🔊 Volume: {Math.round(volume * 100)}%</label>
        <br />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: "220px", cursor: "pointer" }}
        />
      </div>

      {!showResult && (
        <>
          <p>🎵 Tocando abertura...</p>
          <audio ref={audioRef} key={current.audio} src={current.audio} />

          <div className="options">
            {options.map(option => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      {showResult && (
        <>
          <h2>{resultMessage}</h2>

          <video
            ref={videoRef}
            src={current.video}
            width="400"
            autoPlay
            onEnded={() => setVideoEnded(true)}
          />

          <button
            onClick={skipVideo}
            style={{
              marginTop: "15px",
              padding: "10px 25px",
              fontSize: "16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#00ffcc",
              color: "#000",
              fontWeight: "bold"
            }}
          >
            ⏭ Pular vídeo
          </button>
        </>
      )}
    </div>
  )
}

export default App