import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
// Direct imports keep the rest of drei out of the bundle.
import { Html } from '@react-three/drei/web/Html';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import * as THREE from 'three';

/*
 * 3D lecture hall for live sessions (web).
 *
 * The host stands at the podium, speakers stand on the stage, listeners sit
 * on tiered, curved rows facing the stage. A shared screen (LiveKit screen
 * share track) plays on the big screen behind the stage.
 *
 * Props:
 *   participants   [{ user_id, role, name, avatarUrl, hand_raised, is_muted }]
 *   speakingIds    Set of user ids currently speaking
 *   screenTrack    MediaStreamTrack of the shared screen, or null
 *   title          session title shown on the screen when nothing is shared
 *   currentUserId  highlights "you"
 *   onSelect       (userId) => void, when an avatar is clicked
 */

const STAGE_Z = -6;
const STAGE_HEIGHT = 0.5;
const SCREEN_Z = -9.3;
const ROWS = [
  { radius: 6, seats: 7 },
  { radius: 7.4, seats: 9 },
  { radius: 8.8, seats: 11 },
  { radius: 10.2, seats: 13 },
  { radius: 11.6, seats: 15 },
];
const ROW_RISE = 0.45;
const ARC = THREE.MathUtils.degToRad(104);

const PALETTE = ['#6C5CE7', '#00B8A9', '#F8B500', '#FF6B6B', '#4D96FF', '#9B5DE5', '#F15BB5', '#2EC4B6', '#E76F51', '#06D6A0'];
const SKIN = ['#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFDBAC', '#D2A679'];

function hash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function seatPositions() {
  const seats = [];
  ROWS.forEach((row, r) => {
    for (let i = 0; i < row.seats; i += 1) {
      const phi = -ARC / 2 + (ARC * (i + 0.5)) / row.seats;
      seats.push({
        x: Math.sin(phi) * row.radius,
        y: r * ROW_RISE,
        z: STAGE_Z + Math.cos(phi) * row.radius,
        // Face the stage.
        rotation: phi + Math.PI,
      });
    }
  });
  return seats;
}

const SEATS = seatPositions();

function stagePosition(index) {
  // Speakers stand either side of the presenter (who is left of the
  // podium): right, left, further right, further left...
  const right = index % 2 === 0;
  const step = Math.floor(index / 2);
  const x = right ? 1.3 + step * 1.2 : -(2.3 + step * 1.2);
  return { x, y: STAGE_HEIGHT, z: STAGE_Z - 0.3, rotation: 0 };
}

function titleTexture(title) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, '#1b1f3b');
  gradient.addColorStop(1, '#3b2f7a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 12; i += 1) ctx.fillRect(0, i * 60, 1280, 1);
  ctx.fillStyle = '#00D9C0';
  ctx.font = '600 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NESBA LIVE', 640, 290);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px sans-serif';
  const text = (title || 'Live session').slice(0, 42);
  ctx.fillText(text, 640, 380);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '400 32px sans-serif';
  ctx.fillText('The presenter can share their screen here', 640, 450);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function PresentationScreen({ screenTrack, title }) {
  const fallback = useMemo(() => titleTexture(title), [title]);

  const video = useMemo(() => {
    if (!screenTrack) return null;
    const element = document.createElement('video');
    element.muted = true;
    element.playsInline = true;
    element.autoplay = true;
    element.srcObject = new MediaStream([screenTrack]);
    return element;
  }, [screenTrack]);

  const videoTexture = useMemo(() => {
    if (!video) return null;
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [video]);

  useEffect(() => {
    video?.play().catch(() => {});
    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      videoTexture?.dispose();
    };
  }, [video, videoTexture]);

  useEffect(() => () => fallback.dispose(), [fallback]);

  return (
    <group position={[0, 3.6, SCREEN_Z]}>
      {/* Frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[8.5, 4.9, 0.1]} />
        <meshStandardMaterial color="#111322" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh>
        <planeGeometry args={[8.1, 4.55]} />
        <meshBasicMaterial map={videoTexture || fallback} toneMapped={false} />
      </mesh>
      {/* Screen glow on the stage */}
      <pointLight position={[0, 0, 1.5]} intensity={6} distance={9} color={screenTrack ? '#9fc3ff' : '#7b6cf0'} />
    </group>
  );
}

function Room() {
  const floor = useMemo(() => {
    // Subtle plank pattern for the wooden floor.
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 16; i += 1) {
      const shade = 52 + ((i * 37) % 18);
      ctx.fillStyle = `rgb(${shade + 30}, ${shade + 6}, ${shade - 14})`;
      ctx.fillRect(0, i * 32, 512, 32);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, i * 32, 512, 1);
      ctx.fillRect(((i * 113) % 512), i * 32, 1, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useEffect(() => () => floor.dispose(), [floor]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={floor} roughness={0.85} />
      </mesh>

      {/* Back wall, side walls and ceiling */}
      <mesh position={[0, 5, SCREEN_Z - 0.3]}>
        <planeGeometry args={[34, 10]} />
        <meshStandardMaterial color="#2a2f52" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 14, 5, 2]} rotation={[0, -side * Math.PI / 2, 0]}>
          <planeGeometry args={[30, 10]} />
          <meshStandardMaterial color="#252a48" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 9.5, 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#171b30" />
      </mesh>

      {/* Wall panels with warm lights */}
      {[-1, 1].map((side) =>
        [-3, 1, 5, 9].map((z) => (
          <group key={`${side}${z}`} position={[side * 13.9, 3.2, z]} rotation={[0, -side * Math.PI / 2, 0]}>
            <mesh>
              <planeGeometry args={[1.6, 3.4]} />
              <meshStandardMaterial color="#5a3d2b" roughness={0.6} />
            </mesh>
            <mesh position={[0, 2.1, 0.05]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshBasicMaterial color="#ffd8a8" />
            </mesh>
            <pointLight position={[0, 2.1, 0.8]} intensity={5} distance={9} color="#ffc98a" />
          </group>
        ))
      )}

      {/* Stage */}
      <mesh position={[0, STAGE_HEIGHT / 2, STAGE_Z - 1.2]} receiveShadow>
        <boxGeometry args={[14, STAGE_HEIGHT, 4.4]} />
        <meshStandardMaterial color="#5a4030" roughness={0.55} />
      </mesh>
      <mesh position={[0, STAGE_HEIGHT + 0.005, STAGE_Z + 0.95]}>
        <boxGeometry args={[14, 0.02, 0.08]} />
        <meshBasicMaterial color="#00D9C0" />
      </mesh>

      {/* Podium */}
      <group position={[0, STAGE_HEIGHT, STAGE_Z + 0.35]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[1.1, 1.1, 0.6]} />
          <meshStandardMaterial color="#4a3426" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.13, -0.05]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[1.2, 0.06, 0.7]} />
          <meshStandardMaterial color="#5c4130" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.65, 0.31]}>
          <planeGeometry args={[0.6, 0.3]} />
          <meshBasicMaterial color="#6C5CE7" />
        </mesh>
      </group>

      {/* Tiered seating platforms */}
      {ROWS.map((row, r) => (
        <group key={r}>
          <mesh position={[0, r * ROW_RISE + 0.01, STAGE_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[row.radius - 0.65, row.radius + 0.65, 64, 1, -ARC / 2 - 0.12 - Math.PI / 2, ARC + 0.24]} />
            <meshStandardMaterial color={r % 2 ? '#3a2b22' : '#33261e'} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          {r > 0 && (
            <mesh position={[0, (r * ROW_RISE) / 2, STAGE_Z]}>
              <cylinderGeometry args={[row.radius - 0.65, row.radius - 0.65, r * ROW_RISE, 64, 1, true, -ARC / 2 - 0.12, ARC + 0.24]} />
              <meshStandardMaterial color="#241a15" side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}

      {/* Seats */}
      {SEATS.map((seat, i) => (
        <group key={i} position={[seat.x, seat.y, seat.z]} rotation={[0, seat.rotation, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.55, 0.08, 0.5]} />
            <meshStandardMaterial color="#7a1f2b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.55, -0.24]}>
            <boxGeometry args={[0.55, 0.6, 0.07]} />
            <meshStandardMaterial color="#8a2433" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Avatar({ person, position, seated, speaking, isYou, onSelect, labelLayer }) {
  const ring = useRef();
  const head = useRef();
  const seed = hash(person.user_id);
  const color = PALETTE[seed % PALETTE.length];
  const skin = SKIN[(seed >> 3) % SKIN.length];
  const isHost = person.role === 'host';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring.current) {
      const s = speaking ? 1 + Math.sin(t * 8) * 0.12 : 1;
      ring.current.scale.set(s, s, s);
      ring.current.material.opacity = speaking ? 0.85 : 0;
    }
    if (head.current) {
      // Idle sway; nod while speaking.
      head.current.rotation.x = speaking ? Math.sin(t * 6) * 0.12 : Math.sin(t * 0.8 + seed) * 0.04;
    }
  });

  const baseY = seated ? 0.3 : 0;
  const bodyY = seated ? 0.62 : 0.85;

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[0, position.rotation, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(person.user_id);
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      {/* Speaking ring */}
      <mesh ref={ring} position={[0, baseY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.04, 12, 40]} />
        <meshBasicMaterial color="#00D9C0" transparent opacity={0} />
      </mesh>

      {/* Body */}
      <mesh position={[0, bodyY, 0]} castShadow>
        <capsuleGeometry args={[0.26, seated ? 0.32 : 0.6, 6, 16]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>

      {/* Head */}
      <group ref={head} position={[0, bodyY + (seated ? 0.52 : 0.68), 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {[-0.075, 0.075].map((x) => (
          <mesh key={x} position={[x, 0.03, 0.19]}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshBasicMaterial color="#1b1b1b" />
          </mesh>
        ))}
        {isHost && (
          // Headset mic for the presenter.
          <mesh position={[0.17, -0.06, 0.12]} rotation={[0, 0, 0.6]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        )}
      </group>

      {/* Raised hand */}
      {person.hand_raised && (
        <group position={[0.3, bodyY + 0.55, 0.05]} rotation={[0, 0, -0.25]}>
          <mesh>
            <capsuleGeometry args={[0.06, 0.45, 4, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
      )}

      {/* Name tag */}
      {/*
        portal: render into our own container. Without it the first label
        can mount before the canvas is attached, drei re-creates the label
        root and leaves it empty.
      */}
      <Html portal={labelLayer} position={[0, bodyY + (seated ? 1.05 : 1.25), 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div
          onClick={() => onSelect?.(person.user_id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 9px 3px 3px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            pointerEvents: 'auto',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
            color: '#fff',
            background: speaking ? 'rgba(0,140,125,0.92)' : 'rgba(15,18,32,0.82)',
            border: `1px solid ${isYou ? '#00D9C0' : 'rgba(255,255,255,0.18)'}`,
            boxShadow: speaking ? '0 0 14px rgba(0,217,192,0.7)' : 'none',
          }}
        >
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: 11, objectFit: 'cover' }} />
          ) : (
            <span style={{ width: 22, height: 22, borderRadius: 11, background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
              {(person.name || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span style={{ fontWeight: 600 }}>{isYou ? 'You' : (person.name || 'Member').split(' ')[0]}</span>
          {isHost && <span title="Host">🎓</span>}
          {person.role !== 'listener' && <span title={person.is_muted ? 'Muted' : 'Mic on'}>{person.is_muted ? '🔇' : '🎙️'}</span>}
          {person.hand_raised && <span title="Hand raised">✋</span>}
        </div>
      </Html>
    </group>
  );
}

function StageLight() {
  // A spotlight only aims at its target once the target is in the scene.
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(0, 0, STAGE_Z);
    return object;
  }, []);

  return (
    <>
      <primitive object={target} />
      <spotLight position={[0, 8.5, STAGE_Z + 4]} angle={0.6} penumbra={0.6} intensity={160} castShadow target={target} color="#fff2df" />
      <pointLight position={[0, 3.2, STAGE_Z + 1.5]} intensity={8} distance={10} color="#ffe2c4" />
    </>
  );
}

function CameraRig() {
  // Gentle drift so the hall feels alive; OrbitControls still works.
  useFrame(({ camera, clock }) => {
    camera.position.y += Math.sin(clock.getElapsedTime() * 0.25) * 0.0015;
  });
  return null;
}

export default function LectureHall3D({ participants, speakingIds, screenTrack, title, currentUserId, onSelect, style }) {
  const labelLayer = useRef(null);

  const placed = useMemo(() => {
    const host = participants.find((p) => p.role === 'host');
    const speakers = participants.filter((p) => p.role === 'speaker');
    const listeners = participants.filter((p) => p.role === 'listener');
    return [
      ...(host ? [{ person: host, position: { x: -1.05, y: STAGE_HEIGHT, z: STAGE_Z + 0.25, rotation: 0.25 }, seated: false }] : []),
      ...speakers.map((person, i) => ({ person, position: stagePosition(i), seated: false })),
      ...listeners.slice(0, SEATS.length).map((person, i) => ({ person, position: SEATS[i], seated: true })),
    ];
  }, [participants]);

  const overflow = Math.max(0, participants.filter((p) => p.role === 'listener').length - SEATS.length);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden', background: '#0b0d18', ...style }}>
      <Canvas shadows camera={{ position: [0, 7, 10.5], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={['#0b0d18']} />
        <fog attach="fog" args={['#0b0d18', 22, 42]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={['#c9d2ff', '#3a2a1e', 0.9]} />
        <StageLight />
        <directionalLight position={[6, 10, 8]} intensity={0.5} />

        <Room />
        <PresentationScreen screenTrack={screenTrack} title={title} />

        {placed.map(({ person, position, seated }) => (
          <Avatar
            key={person.user_id}
            person={person}
            position={position}
            seated={seated}
            speaking={speakingIds?.has(person.user_id)}
            isYou={person.user_id === currentUserId}
            onSelect={onSelect}
            labelLayer={labelLayer}
          />
        ))}

        <CameraRig />
        <OrbitControls
          target={[0, 1.2, STAGE_Z + 2.5]}
          enablePan={false}
          minDistance={6}
          maxDistance={20}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.15}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>

      {/* Avatar name tags (drei Html) are rendered here. */}
      <div ref={labelLayer} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {overflow > 0 && (
        <div style={{ position: 'absolute', right: 12, bottom: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(15,18,32,0.85)', color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>
          +{overflow} more listening
        </div>
      )}
    </div>
  );
}
