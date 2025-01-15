import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer;
let geometry, material, particles;
let audioContext, analyser, dataArray;
const particlesCount = 5000;

init();

function init() {
  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  // Create particles
  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particlesCount * 3);
  const colors = new Float32Array(particlesCount * 3);

  for(let i = 0; i < particlesCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 100;
    colors[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Post processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 0.4, 0.85
  );
  composer.addPass(bloomPass);

  // Audio setup
  document.getElementById('start-btn').addEventListener('click', startExperience);
}

function startExperience() {
  const audio = document.getElementById('audio');
  audio.play();
  
  document.getElementById('start-overlay').style.display = 'none';
  
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaElementSource(audio);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    
    for(let i = 0; i < particlesCount; i++) {
      const i3 = i * 3;
      const freq = dataArray[i % analyser.frequencyBinCount] / 255;
      
      // 4D rotation
      const time = Date.now() * 0.001;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      
      positions[i3] = x * Math.cos(time * 0.1) - z * Math.sin(time * 0.1);
      positions[i3 + 2] = z * Math.cos(time * 0.1) + x * Math.sin(time * 0.1);
      
      // Pulse with audio
      positions[i3] *= 1 + freq * 0.2;
      positions[i3 + 1] *= 1 + freq * 0.2;
      positions[i3 + 2] *= 1 + freq * 0.2;
      
      // Color modulation
      colors[i3] = freq;
      colors[i3 + 1] = 1 - freq;
      colors[i3 + 2] = 0.5;
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
  }
  
  particles.rotation.x += 0.001;
  particles.rotation.y += 0.002;
  
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});