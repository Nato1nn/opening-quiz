import { useState, useEffect, useRef } from "react"
import { openings } from "./data"
import "./App.css"
import { io } from "socket.io-client"

const socket = io("http://localhost:3001")

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5)
}

function App() {
  const [current, setCurrent] = useState(null)
  const [options, setOptions] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [selected, setSelected] = useState(null)
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore] = useState(0)
  const [roomCode, setRoomCode] = useState(null)
  const [players, setPlayers] = useState([])
  const [hostId, setHostId] = useState(null)
  const [roundResults, setRoundResults] = useState([])
  const [videoEnded, setVideoEnded] = useState(false)

  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const percentage = (timeLeft / 15) * 100
  let barColor = "#00ffcc"
  if (timeLeft <= 5) barColor = "#ff3b3b"
  else if (timeLeft <= 10) barColor = "#ffd93b"

  const isHost = socket.id === hostId

  // ⏱ Timer da rodada
  useEffect(() => {
    if (!current || showResult) return

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)
    }

    setTimeLeft(15)
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          if (isHost && roomCode) socket.emit("end_round", roomCode)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [current, showResult, isHost, roomCode])

  // 🔌 Socket.io
  useEffect(() => {
    socket.on("connect", () => console.log("Conectado:", socket.id))
    socket.on("room_created", code => setRoomCode(code))
    socket.on("update_players", data => {
      setPlayers(data.players)
      setHostId(data.host)
    })
    socket.on("new_round", data => {
      setCurrent(data.opening)
      setOptions(data.options)
      setSelected(null)
      setShowResult(false)
      setRoundResults([])
      setTimeLeft(15)
      setVideoEnded(false)
      if (audioRef.current) audioRef.current.play()
      setIsPlaying(true)
    })
    socket.on("round_result", ({ opening, results }) => {
      setCurrent(opening)
      setShowResult(true)
      setRoundResults(results)
      setVideoEnded(false)
      // tocar o vídeo novamente se necessário
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play()
      }

      const myScore = results.find(r => r.id === socket.id)
      if (myScore) setScore(myScore.points ? myScore.points : 0)
    })

    return () => {
      socket.off("connect")
      socket.off("room_created")
      socket.off("update_players")
      socket.off("new_round")
      socket.off("round_result")
    }
  }, [])

  // 🔹 Próxima rodada automática (host e solo)
  useEffect(() => {
    if (!showResult || !videoEnded) return

    if (roomCode) {
      // Multiplayer: só o host dispara
      if (isHost) socket.emit("start_round", roomCode)
    } else {
      // Solo: avançar localmente
      startRoundSolo()
    }

    setVideoEnded(false)
  }, [showResult, videoEnded, isHost, roomCode])

  // 🎮 Multiplayer / Solo actions
  function createRoom() {
    const playerName = prompt("Digite seu nome:")
    socket.emit("create_room", playerName)
  }
  function joinRoom() {
    const code = prompt("Digite o código da sala:")
    const name = prompt("Digite seu nome:")
    socket.emit("join_room", { roomCode: code, playerName: name })
  }
  function startRoundSolo() {
    const randomOpening = openings[Math.floor(Math.random() * openings.length)]
    const wrongOptions = openings.filter(o => o.anime !== randomOpening.anime).map(o => o.anime)
    const allOptions = shuffle([randomOpening.anime, ...shuffle(wrongOptions).slice(0, 3)])
    setCurrent(randomOpening)
    setOptions(allOptions)
    setSelected(null)
    setShowResult(false)
    setTimeLeft(15)
    setVideoEnded(false)
    if (audioRef.current) audioRef.current.play()
    setIsPlaying(true)
  }

  function handleAnswer(option) {
    setSelected(option)
    const timeTaken = 15 - timeLeft

    if (roomCode) {
      socket.emit("answer", { roomCode, playerId: socket.id, selectedAnime: option, timeTaken })
    } else {
      if (option === current.anime) setScore(prev => prev + 1)
      setShowResult(true)
      setVideoEnded(false)
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }

  // 🔹 Lobby
  if (!started) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", backgroundColor:"#111", color:"white", flexDirection:"column" }}>
        <h1>What is the Opening</h1>
        <button onClick={createRoom}>Criar Sala</button>
        <br/>
        <button onClick={joinRoom}>Entrar na Sala</button>
        {roomCode && <h2>Código da sala: {roomCode}</h2>}
        {players.length>0 && <div><h3>Jogadores:</h3>{players.map(p=><p key={p.id}>{p.name} {p.id===hostId?"(Host)":""}</p>)}</div>}
        <br/>
        {isHost && players.length>1 && roomCode && <button onClick={()=>socket.emit("start_round", roomCode)}>Iniciar Partida</button>}
        <br/>
        <button onClick={()=>{setStarted(true); startRoundSolo()}}>Jogar Solo</button>
      </div>
    )
  }

  // 🔹 Rodada
  if (!current) return null

  return (
    <div className="container">
      <h1 className="title">Qual é o anime?</h1>
      <h2 className="timer">Tempo restante: {timeLeft}s</h2>
      <div className="time-bar-container">
        <div className="time-bar" style={{ width:`${percentage}%`, backgroundColor:barColor }}></div>
      </div>
      <h3 className="score">Pontuação: {score}</h3>

      {!showResult && (
        <>
          <div className="audio-player">
            <p>🎵 Tocando abertura...</p>
            <button onClick={toggleAudio}>{isPlaying?"⏸ Pausar":"▶ Tocar"}</button>
          </div>
          <audio ref={audioRef} key={current.audio} src={current.audio} />
          <div className="options">
            {options.map(option=><button key={option} onClick={()=>handleAnswer(option)}>{option}</button>)}
          </div>
        </>
      )}

      {showResult && (
        <>
          <video
            ref={videoRef}
            src={current.video}
            width="400"
            autoPlay
            style={{ display: "block" }}
            onEnded={() => setVideoEnded(true)}
          />
          {roundResults.length>0 && (
            <>
              <h2>Resultado da rodada:</h2>
              <ul>
                {roundResults.map(r=>(<li key={r.id}>
                  {r.name} {r.correct?"✅":"❌"} {r.time!==null?`${r.time.toFixed(2)}s`:''} {r.points?`→ +${r.points} pts`:''}
                </li>))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App