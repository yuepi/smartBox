<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

// 1. 显式声明并导出歌曲对象的 TypeScript 接口（防止导入时类型报错）
export interface SongItem {
  id: number | string
  name: string
  src: string
  loopStart?: number // 选填：循环开始秒数
  loopEnd?: number   // 选填：循环结束秒数
}

// ===== 组件属性配置 (Props) =====
const props = withDefaults(
  defineProps<{
    autoPlay?: boolean     // 是否自动播放
    defaultVolume?: number // 默认音量 (0 - 1)
    songs?: SongItem[]      // 歌单列表
  }>(),
  {
    songs: () => [],
    defaultVolume: 0.2,
    autoPlay: false,
  }
)

// ===== 状态定义 =====
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isExpanded = ref(false)
const wasPlayingBeforeHide = ref(false)

// 实例化原生 Audio
const audio = new Audio()
audio.loop = false

// 当前正在播放的歌曲配置对象
const currentSong = computed<SongItem | undefined>(() => props.songs[currentIndex.value])

// 计算进度条百分比
const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// ===== 加载并播放歌曲 =====
const loadAndPlay = (index: number) => {
  if (!props.songs || props.songs.length === 0) return

  // 越界保护
  if (index < 0) {
    currentIndex.value = props.songs.length - 1
  } else if (index >= props.songs.length) {
    currentIndex.value = 0
  } else {
    currentIndex.value = index
  }

  const targetSong = props.songs[currentIndex.value]
  if (!targetSong) return

  // 重置状态
  audio.src = targetSong.src
  audio.volume = props.defaultVolume
  currentTime.value = 0

  audio.currentTime = targetSong.loopStart && targetSong.loopStart < (targetSong.loopEnd || 9999) ? targetSong.loopStart : 0;

  // 尝试播放
  audio.play().catch((error) => {
    console.warn('自动播放受限，等待用户点击交互:', error)
    isPlaying.value = false
  })
}

// ===== 循环段落逻辑 =====
const handleTimeUpdate = () => {
  currentTime.value = audio.currentTime
  const song = currentSong.value

  if (!song) return

  if (song.loopStart !== undefined && song.loopEnd !== undefined) {
    const safeEnd = Math.min(song.loopEnd, audio.duration || song.loopEnd)
    if (audio.currentTime >= safeEnd) {
      audio.currentTime = song.loopStart
    }
  }
}

const handleAudioEnded = () => {
  nextTrack()
}

// ===== 操作方法 =====
const togglePlay = () => {
  if (props.songs.length === 0) return
  if (isPlaying.value) {
    audio.pause()
  } else {
    if (audio.src) {
      audio.play().catch((error) => console.warn(error))
    } else {
      loadAndPlay(currentIndex.value)
    }
  }
}

// 下一曲
const nextTrack = () => {
  loadAndPlay(currentIndex.value + 1)
}

// 上一曲
const prevTrack = () => {
  loadAndPlay(currentIndex.value - 1)
}

// 进度条跳转
const handleSeek = (e: Event) => {
  const target = e.target as HTMLInputElement
  const percent = Number.parseFloat(target.value) / 100
  if (!audio.duration) return

  const targetTime = percent * audio.duration
  const song = currentSong.value

  audio.currentTime = song && song.loopEnd !== undefined && targetTime > song.loopEnd ? song.loopStart || 0 : targetTime;
}

const handleLoadedMetadata = () => {
  duration.value = audio.duration
}

// ===== 切后台音乐暂停，切回来恢复播放 =====
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 1. 切后台：记录当前是不是正在播放，如果是，则暂停它
    wasPlayingBeforeHide.value = isPlaying.value
    if (isPlaying.value) {
      audio.pause()
    }
  } else {
    // 2. 切回前台：如果切后台前是播放状态，则恢复播放
    if (wasPlayingBeforeHide.value) {
      audio.play().catch((error) => {
        console.warn('页面恢复后尝试播放失败（可能需要用户点击）:', error)
      })
    }
  }
}

// ===== 绑定与解绑 =====
const bindAudioEvents = () => {
  audio.addEventListener('timeupdate', handleTimeUpdate)
  audio.addEventListener('loadedmetadata', handleLoadedMetadata)
  audio.addEventListener('ended', handleAudioEnded)
  audio.addEventListener('play', () => isPlaying.value = true)
  audio.addEventListener('pause', () => isPlaying.value = false)
}

const unbindAudioEvents = () => {
  audio.removeEventListener('timeupdate', handleTimeUpdate)
  audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
  audio.removeEventListener('ended', handleAudioEnded)
  audio.removeEventListener('play', () => isPlaying.value = true)
  audio.removeEventListener('pause', () => isPlaying.value = false)
}

// ===== 生命周期 =====
watch(() => props.songs, (newSongs) => {
  if (newSongs.length > 0 && props.autoPlay) {
    loadAndPlay(0)
  }
}, { immediate: true })

onMounted(() => {
  bindAudioEvents()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (props.songs.length > 0 && props.autoPlay) {
    loadAndPlay(0)
  }
})

onUnmounted(() => {
  unbindAudioEvents()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  audio.pause()
  audio.src = ''
})
</script>

<template>
  <div
v-if="currentSong"
    class="music-player fixed bottom-6 right-6 z-50 flex items-center rounded-full bg-slate-900/80 text-white backdrop-blur-md border border-slate-700/50 shadow-lg transition-all duration-300 ease-in-out select-none overflow-hidden"
    :class="isExpanded ? 'max-w-[400px] h-11 px-3 gap-3' : 'w-11 h-11 justify-center p-0 gap-0'"
>
    <div
      class="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
      @click="isExpanded = !isExpanded" :title="isExpanded ? '收起播放器' : '展开播放器'"
>
      <span
class="text-lg transition-transform duration-1000 origin-center block"
        :class="isPlaying ? 'animate-spin-slow' : ''"
>
        🎵
      </span>
    </div>

    <div v-show="isExpanded" class="flex items-center gap-3 flex-shrink-0 w-max">
      <button class="hover:text-cyan-400 text-sm transition-colors cursor-pointer" title="上一曲" @click="prevTrack">
        ⏮
      </button>

      <button
class="hover:text-cyan-400 text-sm transition-colors cursor-pointer min-w-[32px] text-left"
        @click="togglePlay"
>
        {{ isPlaying ? '暂停' : '播放' }}
      </button>

      <div class="flex flex-col max-w-[80px]">
        <span class="text-[10px] truncate text-slate-300" :title="currentSong.name">
          {{ currentSong.name }}
        </span>
        <span class="text-[9px] text-cyan-400 font-medium">
          {{ isPlaying ? 'PLAYING' : 'PAUSED' }}
        </span>
      </div>

      <button class="hover:text-cyan-400 text-sm transition-colors cursor-pointer" title="下一曲" @click="nextTrack">
        ⏭
      </button>

      <input
type="range" min="0" max="100" :value="progress"
        class="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" @input="handleSeek"
/>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 6s linear infinite;
}

.music-player {
  transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.3s ease;
}

/* 优化 range 样式 */
input[type="range"]::-webkit-slider-runnable-track {
  height: 4px;
  background: rgb(255 255 255 / 10%);
  border-radius: 2px;
}

input[type="range"]::-webkit-slider-thumb {
  margin-top: -4px;
}
</style>
