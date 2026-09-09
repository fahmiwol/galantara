import { TEAM, otherTeam } from './config.js';
import { clamp } from './math.js';

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function auraColor(charge, colors) {
  if (charge >= 80) return colors.high;
  if (charge >= 40) return colors.medium;
  if (charge > 0) return colors.low;
  return colors.empty;
}

export class BentengRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.config = config;
    this.width = 0;
    this.height = 0;
    this.scale = 1;
    this.center = { x: 0, y: 0 };
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.lastRealTime = performance.now();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.visual.dprCap);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const usableW = Math.max(1, this.width - this.config.visual.fieldMargin * 2);
    const usableH = Math.max(1, this.height - this.config.visual.fieldMargin * 2);
    this.scale = Math.min(
      usableW / this.config.arena.width,
      usableH / this.config.arena.height,
    );
    this.center.x = this.width / 2;
    this.center.y = this.height / 2;
  }

  worldToScreen(point) {
    return {
      x: this.center.x + point.x * this.scale,
      y: this.center.y + point.y * this.scale,
    };
  }

  emit(event) {
    const colors = this.config.visual.teamColors;
    switch (event.type) {
      case 'tag':
        this.shake = Math.max(this.shake, this.config.visual.screenShakeTag);
        this._burst(event.loser.position, colors[event.winner.team], 20, 5.2);
        break;
      case 'nearMiss':
        this.flash = 0.28;
        this._burst(event.unit.position, '#fff7d6', 12, 3.4);
        break;
      case 'rescue':
        this.shake = Math.max(this.shake, this.config.visual.screenShakeRescue);
        this.flash = 0.45;
        this._burst(event.rescuer.position, colors[event.team], 36, 7.2);
        break;
      case 'burst':
        this._burst(event.unit.position, colors[event.unit.team], 8, 2.6);
        break;
      case 'refill':
        this._burst(event.unit.position, '#fff7d6', 14, 3.2);
        break;
      case 'bounce': {
        const midpoint = {
          x: (event.units[0].position.x + event.units[1].position.x) / 2,
          y: (event.units[0].position.y + event.units[1].position.y) / 2,
        };
        this._burst(midpoint, '#f8fafc', 10, 3.8);
        break;
      }
      default:
        break;
    }
  }

  _burst(position, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.35;
      const velocity = speed * (0.45 + Math.random() * 0.55);
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        size: 0.07 + Math.random() * 0.12,
      });
    }
    if (this.particles.length > this.config.visual.particleLimit) {
      this.particles.splice(0, this.particles.length - this.config.visual.particleLimit);
    }
  }

  render(state) {
    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastRealTime) / 1000);
    this.lastRealTime = now;
    this._updateEffects(delta);
    const ctx = this.context;

    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, '#111936');
    sky.addColorStop(0.48, '#241b45');
    sky.addColorStop(1, '#4c1d48');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    if (this.shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this._drawArena(ctx, state);
    this._drawForts(ctx, state);
    this._drawJailsAndChains(ctx, state);
    this._drawObstacles(ctx);
    this._drawUnits(ctx, state);
    this._drawParticles(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,247,214,${this.flash * 0.2})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  _updateEffects(delta) {
    this.shake *= Math.pow(0.04, delta);
    this.flash = Math.max(0, this.flash - delta * 1.8);
    for (const particle of this.particles) {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= Math.pow(0.08, delta);
      particle.vy *= Math.pow(0.08, delta);
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  _drawArena(ctx, state) {
    const topLeft = this.worldToScreen({
      x: -state.config.arena.width / 2,
      y: -state.config.arena.height / 2,
    });
    const width = state.config.arena.width * this.scale;
    const height = state.config.arena.height * this.scale;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#183a36';
    roundedRect(ctx, topLeft.x, topLeft.y, width, height, 22);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRect(ctx, topLeft.x, topLeft.y, width, height, 22);
    ctx.clip();
    const field = ctx.createLinearGradient(topLeft.x, topLeft.y, topLeft.x + width, topLeft.y);
    field.addColorStop(0, '#164e63');
    field.addColorStop(0.48, '#285943');
    field.addColorStop(0.52, '#4d5b35');
    field.addColorStop(1, '#7f1d3f');
    ctx.fillStyle = field;
    ctx.fillRect(topLeft.x, topLeft.y, width, height);

    ctx.strokeStyle = 'rgba(255,247,214,.08)';
    ctx.lineWidth = 1;
    const grid = Math.max(18, this.scale * 2);
    for (let x = topLeft.x; x <= topLeft.x + width; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, topLeft.y); ctx.lineTo(x, topLeft.y + height); ctx.stroke();
    }
    for (let y = topLeft.y; y <= topLeft.y + height; y += grid) {
      ctx.beginPath(); ctx.moveTo(topLeft.x, y); ctx.lineTo(topLeft.x + width, y); ctx.stroke();
    }

    ctx.setLineDash([this.scale * 0.8, this.scale * 0.55]);
    ctx.strokeStyle = 'rgba(255,247,214,.3)';
    ctx.lineWidth = Math.max(2, this.scale * 0.12);
    ctx.beginPath();
    ctx.moveTo(this.center.x, topLeft.y);
    ctx.lineTo(this.center.x, topLeft.y + height);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let index = 0; index < 18; index += 1) {
      const angle = index * 2.399;
      const radius = (index % 5 + 1) * this.scale * 0.65;
      const x = this.center.x + Math.cos(angle) * radius;
      const y = this.center.y + Math.sin(angle) * radius;
      ctx.fillStyle = index % 2 ? 'rgba(253,224,71,.13)' : 'rgba(244,114,182,.11)';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, this.scale * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,247,214,.5)';
    ctx.lineWidth = 3;
    roundedRect(ctx, topLeft.x, topLeft.y, width, height, 22);
    ctx.stroke();
  }

  _drawForts(ctx, state) {
    for (const team of Object.values(TEAM)) {
      const position = this.worldToScreen(state.forts[team]);
      const radius = state.config.fort.radius * this.scale;
      const teamColor = state.config.visual.teamColors[team];
      ctx.fillStyle = `${teamColor}18`;
      ctx.strokeStyle = `${teamColor}88`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(position.x, position.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.05;
      ctx.save();
      ctx.shadowColor = teamColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(position.x, position.y, this.scale * 0.72 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(position.x, position.y, this.scale * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const progress = state.captureProgress[otherTeam(team)] / state.config.fort.captureDuration;
      if (progress > 0) {
        ctx.strokeStyle = '#fff7d6';
        ctx.lineWidth = Math.max(3, this.scale * 0.18);
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.scale * 1.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255,255,255,.82)';
      ctx.font = `800 ${clamp(this.scale * 0.62, 9, 14)}px Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`BENTENG ${team.toUpperCase()}`, position.x, position.y + radius + 15);
    }
  }

  _drawJailsAndChains(ctx, state) {
    for (const team of Object.values(TEAM)) {
      const jail = this.worldToScreen(state.jails[team]);
      const lastPrisoner = state.units
        .filter((unit) => unit.team === team && unit.captured)
        .sort((a, b) => a.captureOrder - b.captureOrder)
        .at(-1);
      const end = this.worldToScreen(lastPrisoner?.position || state.jails[team]);
      const color = state.config.visual.teamColors[team];
      ctx.strokeStyle = `${color}aa`;
      ctx.lineWidth = Math.max(2, this.scale * 0.12);
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(jail.x, jail.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(15,23,42,.76)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      roundedRect(ctx, jail.x - this.scale * 0.55, jail.y - this.scale * 0.55, this.scale * 1.1, this.scale * 1.1, 5);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = `900 ${clamp(this.scale * 0.55, 8, 12)}px Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('TAWAN', jail.x, jail.y - this.scale * 0.8);
    }
  }

  _drawObstacles(ctx) {
    for (const obstacle of this.config.arena.obstacles) {
      const center = this.worldToScreen(obstacle);
      const width = obstacle.width * this.scale;
      const height = obstacle.height * this.scale;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = obstacle.kind === 'bambu' ? '#5d6b2f' : '#9a5a2c';
      roundedRect(ctx, center.x - width / 2, center.y - height / 2, width, height, 7);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = obstacle.kind === 'bambu' ? '#c4d96b' : '#f0b15b';
      ctx.lineWidth = 2;
      roundedRect(ctx, center.x - width / 2, center.y - height / 2, width, height, 7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,247,214,.65)';
      ctx.font = `700 ${clamp(this.scale * 0.55, 8, 12)}px Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(obstacle.kind === 'bambu' ? 'BAMBU' : 'GEROBAK', center.x, center.y + 4);
    }
  }

  _drawUnits(ctx, state) {
    const sorted = [...state.units].sort((a, b) => Number(a.captured) - Number(b.captured));
    for (const unit of sorted) {
      const position = this.worldToScreen(unit.position);
      const unitRadius = state.config.arena.unitRadius * this.scale;
      const teamColor = state.config.visual.teamColors[unit.team];
      const chargeColor = auraColor(unit.charge, state.config.visual.aura);
      const chargeRatio = unit.charge / state.config.muatan.full;

      ctx.save();
      ctx.globalAlpha = unit.captured ? 0.62 : 1;
      ctx.shadowColor = chargeColor;
      ctx.shadowBlur = unit.captured ? 2 : 10 + chargeRatio * 15;
      ctx.strokeStyle = chargeColor;
      ctx.lineWidth = clamp(this.config.visual.auraWidth * (0.65 + chargeRatio * 0.35), 3, 9);
      ctx.beginPath();
      ctx.arc(position.x, position.y, unitRadius * (1.28 + chargeRatio * 0.18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const body = ctx.createRadialGradient(
        position.x - unitRadius * 0.25,
        position.y - unitRadius * 0.3,
        unitRadius * 0.15,
        position.x,
        position.y,
        unitRadius,
      );
      body.addColorStop(0, '#fff');
      body.addColorStop(0.18, teamColor);
      body.addColorStop(1, state.config.visual.teamDark[unit.team]);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(position.x, position.y, unitRadius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = unit.isPlayer ? '#fff7d6' : 'rgba(15,23,42,.8)';
      ctx.lineWidth = unit.isPlayer ? 3 : 2;
      ctx.stroke();

      const direction = normalizeOrUp(unit.velocity);
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.moveTo(position.x + direction.x * unitRadius * 0.82, position.y + direction.y * unitRadius * 0.82);
      ctx.lineTo(position.x - direction.y * unitRadius * 0.24, position.y + direction.x * unitRadius * 0.24);
      ctx.lineTo(position.x + direction.y * unitRadius * 0.24, position.y - direction.x * unitRadius * 0.24);
      ctx.closePath(); ctx.fill();

      if (unit.captured) {
        ctx.fillStyle = '#0f172a';
        ctx.font = `900 ${clamp(unitRadius * 0.9, 9, 15)}px Nunito, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⛓', position.x, position.y + 5);
      }
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(248,250,252,.94)';
      // Tawanan berjajar 1,2 unit dunia (~45 px di layar penuh) sementara nama
      // seperti "Rajawali" selebar 49 px, jadi labelnya saling tumpuk jadi
      // gumpalan. Identitas tawanan sudah dibaca dari roster (ikon rantai);
      // yang perlu dibaca di arena adalah panjang rantai dan ujungnya.
      if (!unit.captured) {
        ctx.font = `800 ${clamp(this.scale * 0.58, 8, 12)}px Nunito, sans-serif`;
        ctx.fillText(unit.name, position.x, position.y - this.config.visual.unitLabelOffset * this.scale);
      }
      ctx.fillStyle = chargeColor;
      ctx.font = `900 ${clamp(this.scale * 0.54, 8, 11)}px monospace`;
      ctx.fillText(`${Math.round(unit.charge)}`, position.x, position.y + this.config.visual.chargeLabelOffset * this.scale);
    }
  }

  _drawParticles(ctx) {
    for (const particle of this.particles) {
      const position = this.worldToScreen(particle);
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(position.x, position.y, Math.max(1, particle.size * this.scale), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function normalizeOrUp(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.08) return { x: 0, y: -1 };
  return { x: vector.x / length, y: vector.y / length };
}
