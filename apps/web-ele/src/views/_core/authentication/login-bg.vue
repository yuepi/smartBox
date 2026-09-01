<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import gsap from 'gsap';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let particles: Array<{
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  x: number;
  y: number;
}> = [];
let animationId: number;
let gsapCtx: gsap.Context | null = null;

const initParticles = () => {
  const canvas = canvasRef.value!;
  const count = 80;
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      color: `hsl(${220 + Math.random() * 30}, 70%, 60%)`,
    });
  }
};

const draw = () => {
  const canvas = canvasRef.value!;
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制连线
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100, 140, 255, ${0.15 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }

  // 绘制粒子
  particles.forEach((p) => {
    ctx!.beginPath();
    ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx!.fillStyle = p.color;
    ctx!.fill();
    // 光晕
    ctx!.shadowColor = p.color;
    ctx!.shadowBlur = 15;
    ctx!.fill();
    ctx!.shadowBlur = 0;
  });
};

const animate = () => {
  const canvas = canvasRef.value!;
  particles.forEach((p) => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  });
  draw();
  animationId = requestAnimationFrame(animate);
};

const resizeCanvas = () => {
  const canvas = canvasRef.value!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
};

onMounted(() => {
  const canvas = canvasRef.value!;
  ctx = canvas.getContext('2d')!;
  resizeCanvas();
  animate();

  // GASP 驱动粒子颜色渐变（氛围变化）
  gsapCtx = gsap.context(() => {
    gsap.to(particles, {
      duration: 20,
      color: 'hsl(260, 70%, 60%)',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.05,
    });
  });

  window.addEventListener('resize', resizeCanvas);
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', resizeCanvas);
  gsapCtx?.revert();
});
</script>

<template>
  <canvas ref="canvasRef" class="login-bg-canvas"></canvas>
</template>

<style scoped>
.login-bg-canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
}
</style>
