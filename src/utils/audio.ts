/**
 * Web Audio 音效合成器（零资源依赖，REQ-FEEL-001：连锁音效音阶逐次升高）
 * 使用 OscillatorNode 现场合成，避免加载音频文件；移动端需在首次用户交互后激活
 */

type SoundName = 'match' | 'combo' | 'skill' | 'hit' | 'heal' | 'select' | 'invalid' | 'shuffle' | 'victory' | 'defeat'

class AudioManager {
  private ctx: AudioContext | null = null
  private enabled = true

  /** 设置开关 */
  setEnabled(v: boolean): void {
    this.enabled = v
  }

  /** 激活 AudioContext（必须在用户手势内调用一次） */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
    } catch (e) {
      console.warn('[audio] Web Audio 不可用', e)
    }
  }

  /** 播放合成音：freq 主频，combo 级数提升音高（REQ-FEEL-001） */
  play(name: SoundName, combo = 0): void {
    if (!this.enabled) return
    this.unlock()
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      let freq = 440
      let duration = 0.12
      let type: OscillatorType = 'sine'
      let peak = 0.12

      switch (name) {
        case 'match':
        case 'combo':
          // 音阶逐次升高：C 大调音阶
          freq = 440 * Math.pow(2, Math.min(combo, 8) / 12 * 2)
          type = 'triangle'
          duration = 0.12
          break
        case 'skill':
          freq = 220
          type = 'sawtooth'
          duration = 0.35
          peak = 0.1
          break
        case 'hit':
          freq = 130
          type = 'square'
          duration = 0.15
          peak = 0.08
          break
        case 'heal':
          freq = 660
          type = 'sine'
          duration = 0.25
          break
        case 'select':
          freq = 880
          type = 'sine'
          duration = 0.06
          peak = 0.06
          break
        case 'invalid':
          freq = 180
          type = 'square'
          duration = 0.1
          peak = 0.06
          break
        case 'shuffle':
          freq = 330
          type = 'triangle'
          duration = 0.3
          break
        case 'victory':
          freq = 523
          type = 'triangle'
          duration = 0.5
          peak = 0.15
          break
        case 'defeat':
          freq = 200
          type = 'sine'
          duration = 0.6
          peak = 0.1
          break
      }

      osc.type = type
      osc.frequency.setValueAtTime(freq, now)
      // 轻微上滑增加"打击感"
      osc.frequency.linearRampToValueAtTime(freq * 1.12, now + duration * 0.6)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(peak, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

      osc.start(now)
      osc.stop(now + duration + 0.05)
    } catch {
      /* 音频失败不影响游戏 */
    }
  }
}

export const audio = new AudioManager()
