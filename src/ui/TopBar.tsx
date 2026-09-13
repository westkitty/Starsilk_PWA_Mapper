import React from 'react';
import { Eye, Volume2, VolumeX, Grid, Download, Upload, Sparkles } from 'lucide-react';
import { ScaleMode } from '../rendering/scale-transform';
import { SystemStatus, CelestialBody } from '../simulation/types';
import { BodySearchBar } from './BodySearchBar';
import { ThemeSelector, AstrometricTheme } from './ThemeSelector';
import { AccessibilityControls } from './AccessibilityControls';
import { ScreenshotTool } from './ScreenshotTool';
import { VirialGauge } from './VirialGauge';
import { RelativisticAberrationToggle } from './RelativisticAberrationToggle';
import { BarChart2, Compass, HelpCircle, Share2, Rocket, Award, CloudSun, Sparkle, Activity, FileText, Navigation, Zap, Cpu, Sun, Orbit, Shield, Disc, Waves } from 'lucide-react';

export type AppMode = 'BUILD' | 'SIMULATE' | 'FORECAST' | 'CANON LAB' | 'PRESENT';

interface TopBarProps {
  projectName: string;
  sigilSvg: string;
  systemStatus?: SystemStatus;
  mode: AppMode;
  onSetMode: (m: AppMode) => void;
  scaleMode: ScaleMode;
  onToggleScaleMode: () => void;
  collisionsEnabled: boolean;
  onToggleCollisions: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  gravityGridVisible: boolean;
  onToggleGravityGrid: () => void;
  onExport: () => void;
  onImport: () => void;
  onLoadPreset: (name: 'demo' | 'meridian' | 'blank' | 'sol' | 'trappist') => void;
  bodies?: CelestialBody[];
  onSelectBody?: (id: string) => void;
  onOpenNavigator?: () => void;
  onOpenStats?: () => void;
  onOpenShortcuts?: () => void;
  onOpenAudioSettings?: () => void;
  onOpenTransfer?: () => void;
  onOpenResonance?: () => void;
  onOpenChallenge?: () => void;
  onOpenEphemeris?: () => void;
  onOpenManeuver?: () => void;
  onOpenClimate?: () => void;
  onOpenProcedural?: () => void;
  onOpenStellarIntruder?: () => void;
  onOpenShare?: () => void;
  onTogglePerf?: () => void;
  onOpenBarycenter?: () => void;
  onOpenSolarCycle?: () => void;
  onOpenHighway?: () => void;
  onOpenDysonSwarm?: () => void;
  onOpenSynodic?: () => void;
  onOpenEquipotential?: () => void;
  onOpenPoynting?: () => void;
  onOpenGravityGradient?: () => void;
  currentTheme?: AstrometricTheme;
  onSelectTheme?: (theme: AstrometricTheme) => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  sigilSvg,
  systemStatus,
  mode,
  onSetMode,
  scaleMode,
  onToggleScaleMode,
  collisionsEnabled,
  onToggleCollisions,
  audioEnabled,
  onToggleAudio,
  gravityGridVisible,
  onToggleGravityGrid,
  onExport,
  onImport,
  onLoadPreset,
  bodies = [],
  onSelectBody,
  onOpenNavigator,
  onOpenStats,
  onOpenShortcuts,
  onOpenAudioSettings,
  onOpenTransfer,
  onOpenResonance,
  onOpenChallenge,
  onOpenEphemeris,
  onOpenManeuver,
  onOpenClimate,
  onOpenProcedural,
  onOpenStellarIntruder,
  onOpenShare,
  onTogglePerf,
  onOpenBarycenter,
  onOpenSolarCycle,
  onOpenHighway,
  onOpenDysonSwarm,
  onOpenSynodic,
  onOpenEquipotential,
  onOpenPoynting,
  onOpenGravityGradient,
  currentTheme = 'obsidian',
  onSelectTheme,
  isHighContrast = false,
  onToggleHighContrast,
}) => {
  return (
    <header className="top-hud-bar hud-interactive">
      {/* Brand & Sigil */}
      <div className="brand-section">
        <div
          className="brand-sigil"
          dangerouslySetInnerHTML={{ __html: sigilSvg }}
          title="System Sigil — Deterministic Architectural Fingerprint"
        />
        <div>
          <div className="brand-title">STARSILK SYSTEM PLANNER</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-subtitle">{projectName}</span>
            {systemStatus === 'destroyed_by_starsilk_collapse' && (
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#ff4d64',
                background: 'rgba(136, 0, 16, 0.5)',
                border: '1px solid #ff4d64',
                padding: '1px 6px',
                borderRadius: '3px',
                textTransform: 'uppercase',
              }}>
                SYSTEM DESTROYED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => onLoadPreset('demo')}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Load demonstration system"
        >
          Demo System
        </button>
        <button
          onClick={() => onLoadPreset('meridian')}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Load source-backed Virgil & Meridian Station scenario"
        >
          Meridian Study
        </button>
        <button
          onClick={() => onLoadPreset('blank')}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Empty void for new creation"
        >
          Blank System
        </button>
        <button
          onClick={() => onLoadPreset('sol')}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Load Real Solar System (Sun + 8 Planets)"
        >
          Sol
        </button>
        <button
          onClick={() => onLoadPreset('trappist')}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Load 7-Planet Resonant TRAPPIST-1 System"
        >
          TRAPPIST-1
        </button>
      </div>

      {/* Center Modes */}
      <nav className="mode-switcher">
        {(['BUILD', 'SIMULATE', 'FORECAST', 'CANON LAB', 'PRESENT'] as AppMode[]).map((m) => (
          <button
            key={m}
            className={`mode-tab ${mode === m ? 'active' : ''}`}
            onClick={() => onSetMode(m)}
          >
            {m === 'CANON LAB' && <Sparkles size={12} />}
            {m}
          </button>
        ))}
      </nav>

      {/* Right Controls / Lenses */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Scale Toggle */}
        <button
          onClick={onToggleScaleMode}
          style={{
            background: scaleMode === 'true' ? '#0cc6ff' : 'rgba(7, 19, 30, 0.8)',
            color: scaleMode === 'true' ? '#03050a' : 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          title={scaleMode === 'true' ? 'True astronomical scale (empty void)' : 'Readable exaggerated scale'}
        >
          <Eye size={13} />
          {scaleMode === 'true' ? 'TRUE SCALE' : 'READABLE'}
        </button>

        {/* Collisions Toggle */}
        <button
          onClick={onToggleCollisions}
          style={{
            background: collisionsEnabled ? 'rgba(12, 198, 255, 0.15)' : 'rgba(7, 19, 30, 0.8)',
            color: collisionsEnabled ? 'var(--accent-azure)' : 'var(--text-muted)',
            border: `1px solid ${collisionsEnabled ? 'var(--accent-azure)' : 'var(--border-subtle)'}`,
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Toggle physical collisions and momentum merges"
        >
          COLLISIONS: {collisionsEnabled ? 'ON' : 'OFF'}
        </button>

        {/* Gravity Field Grid */}
        <button
          onClick={onToggleGravityGrid}
          style={{
            background: gravityGridVisible ? 'rgba(12, 198, 255, 0.15)' : 'rgba(7, 19, 30, 0.8)',
            color: gravityGridVisible ? 'var(--accent-azure)' : 'var(--text-muted)',
            border: `1px solid ${gravityGridVisible ? 'var(--accent-azure)' : 'var(--border-subtle)'}`,
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
          }}
          title="Toggle Newtonian Potential Gravity Grid"
        >
          <Grid size={14} />
        </button>

        {/* Search */}
        {onSelectBody && <BodySearchBar bodies={bodies} onSelectBody={onSelectBody} />}

        {/* Navigator */}
        {onOpenNavigator && (
          <button
            onClick={onOpenNavigator}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Open System Navigator (N)"
          >
            <Compass size={14} />
          </button>
        )}

        {/* System Stats */}
        {onOpenStats && (
          <button
            onClick={onOpenStats}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="System Astrometric Overview"
          >
            <BarChart2 size={14} />
          </button>
        )}

        {/* Shortcuts / Help */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Keyboard Shortcuts & Controls (?)"
          >
            <HelpCircle size={14} />
          </button>
        )}

        {/* Audio Toggle & Settings */}
        <button
          onClick={onToggleAudio}
          onContextMenu={(e) => {
            e.preventDefault();
            if (onOpenAudioSettings) onOpenAudioSettings();
          }}
          style={{
            background: audioEnabled ? 'rgba(12, 198, 255, 0.15)' : 'rgba(7, 19, 30, 0.8)',
            color: audioEnabled ? 'var(--accent-azure)' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
          }}
          title={audioEnabled ? 'Sound ON (Right-click for settings)' : 'Sound OFF (Right-click for settings)'}
        >
          {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>

        {/* Theme & Accessibility */}
        {onSelectTheme && <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />}
        {onToggleHighContrast && (
          <AccessibilityControls isHighContrast={isHighContrast} onToggleHighContrast={onToggleHighContrast} />
        )}

        {/* Virial Equilibrium Gauge */}
        <VirialGauge bodies={bodies} />

        {/* Screenshot Exporter */}
        <ScreenshotTool />

        {/* Relativistic Aberration Toggle */}
        <RelativisticAberrationToggle />

        {/* Hohmann Transfer Calculator */}
        {onOpenTransfer && (
          <button
            onClick={onOpenTransfer}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Interplanetary Transfer Calculator"
          >
            <Rocket size={14} />
          </button>
        )}

        {/* Resonances Catalog */}
        {onOpenResonance && (
          <button
            onClick={onOpenResonance}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Mean-Motion Resonance Catalog"
          >
            <Activity size={14} />
          </button>
        )}

        {/* Challenges Hub */}
        {onOpenChallenge && (
          <button
            onClick={onOpenChallenge}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Astrodynamic Challenges & Missions"
          >
            <Award size={14} />
          </button>
        )}

        {/* Climate & Biosphere Inspector */}
        {onOpenClimate && (
          <button
            onClick={onOpenClimate}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Climate & Earth Similarity Index"
          >
            <CloudSun size={14} />
          </button>
        )}

        {/* Procedural System Synthesizer */}
        {onOpenProcedural && (
          <button
            onClick={onOpenProcedural}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Procedural System Synthesizer"
          >
            <Sparkle size={14} />
          </button>
        )}

        {/* Ephemeris Export */}
        {onOpenEphemeris && (
          <button
            onClick={onOpenEphemeris}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="NASA Horizons Ephemeris Exporter"
          >
            <FileText size={14} />
          </button>
        )}

        {/* Maneuver Node */}
        {onOpenManeuver && (
          <button
            onClick={onOpenManeuver}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Impulsive Maneuver Node Planner"
          >
            <Navigation size={14} />
          </button>
        )}

        {/* Rogue Stellar Intruder */}
        {onOpenStellarIntruder && (
          <button
            onClick={onOpenStellarIntruder}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Inject Rogue Stellar Intruder"
          >
            <Zap size={14} />
          </button>
        )}

        {/* Telemetry Overlay Toggle */}
        {onTogglePerf && (
          <button
            onClick={onTogglePerf}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Toggle Engine Telemetry Overlay"
          >
            <Cpu size={14} />
          </button>
        )}

        {/* Share System */}
        {onOpenShare && (
          <button
            onClick={onOpenShare}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Share System Link / Sigil"
          >
            <Share2 size={14} />
          </button>
        )}

        {/* Barycenter Telemetry */}
        {onOpenBarycenter && (
          <button
            onClick={onOpenBarycenter}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="System Center of Mass & Stellar Reflex Barycenter"
          >
            <Compass size={14} />
          </button>
        )}

        {/* Solar Cycle & CME */}
        {onOpenSolarCycle && (
          <button
            onClick={onOpenSolarCycle}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Stellar Activity & Sunspot Cycle"
          >
            <Sun size={14} />
          </button>
        )}

        {/* Interplanetary Highway (ITN) */}
        {onOpenHighway && (
          <button
            onClick={onOpenHighway}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Interplanetary Transport Network (ITN)"
          >
            <Orbit size={14} />
          </button>
        )}

        {/* Dyson Swarm Planner */}
        {onOpenDysonSwarm && (
          <button
            onClick={onOpenDysonSwarm}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Dyson Swarm Megastructure Planner"
          >
            <Disc size={14} />
          </button>
        )}

        {/* Synodic Periods */}
        {onOpenSynodic && (
          <button
            onClick={onOpenSynodic}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Planetary Synodic Alignment Calendar"
          >
            <Activity size={14} />
          </button>
        )}

        {/* Roche Lobe Equipotential */}
        {onOpenEquipotential && (
          <button
            onClick={onOpenEquipotential}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Roche Lobe & Jacobi Equipotential"
          >
            <Shield size={14} />
          </button>
        )}

        {/* Gravity Gradient Stabilization */}
        {onOpenGravityGradient && (
          <button
            onClick={onOpenGravityGradient}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Gravity Gradient Attitude Stabilization"
          >
            <Waves size={14} />
          </button>
        )}

        {/* Poynting-Robertson Radiative Drag */}
        {onOpenPoynting && (
          <button
            onClick={onOpenPoynting}
            style={{
              background: 'rgba(7, 19, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Poynting-Robertson Dust Radiative Drag"
          >
            <Sparkle size={14} />
          </button>
        )}

        {/* Export / Import */}
        <button
          onClick={onExport}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
          }}
          title="Export System (.ssp.json)"
        >
          <Download size={14} />
        </button>

        <button
          onClick={onImport}
          style={{
            background: 'rgba(7, 19, 30, 0.8)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
          }}
          title="Import System (.ssp.json)"
        >
          <Upload size={14} />
        </button>
      </div>
    </header>
  );
};
