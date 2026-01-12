import { forwardRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PLAYER_ROLE_MAP, ROLE_DISPLAY_NAMES, ALL_PLAYERS, type PlayerRole } from '@/lib/playerRoles';
import logoImage from '@/assets/logo.jpg';

interface PlayerGradeData {
  player_name: string;
  voto_generale: number | null;
  commento?: string | null;
  [key: string]: string | number | null | undefined;
}

interface GradeSheetImageProps {
  date: string;
  sheetType: 'classica' | 'dettagliata';
  grades: PlayerGradeData[];
  note?: string | null;
}

const GradeSheetImage = forwardRef<HTMLDivElement, GradeSheetImageProps>(
  ({ date, sheetType, grades, note }, ref) => {
    // Sort grades by alphabetical order
    const sortedGrades = ALL_PLAYERS
      .filter(playerName => grades.some(g => g.player_name === playerName))
      .map(playerName => grades.find(g => g.player_name === playerName)!)
      .filter(Boolean);

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 50%, #1a1a2e 100%)',
          fontFamily: 'Montserrat, sans-serif',
          padding: '40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(138, 43, 226, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(65, 105, 225, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Header with logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          <img
            src={logoImage}
            alt="Logo"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '4px solid rgba(138, 43, 226, 0.5)',
              objectFit: 'cover',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '42px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #8a2be2, #4169e1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                letterSpacing: '2px',
              }}
            >
              PAGELLINO
            </h1>
            <p
              style={{
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: '4px 0 0 0',
                fontWeight: '500',
              }}
            >
              {format(new Date(date), 'd MMMM yyyy', { locale: it })}
            </p>
          </div>
        </div>


        {/* Grades list */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
          }}
        >
          {sortedGrades.map((grade, index) => {
            const role = PLAYER_ROLE_MAP[grade.player_name] as PlayerRole;
            const roleName = role ? ROLE_DISPLAY_NAMES[role] : '';

            return (
              <div
                key={grade.player_name}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderLeft: '4px solid #8a2be2',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: '600',
                      }}
                    >
                      {grade.player_name}
                    </span>
                    <span
                      style={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '13px',
                        fontWeight: '400',
                      }}
                    >
                      {roleName}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #8a2be2, #4169e1)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)',
                    }}
                  >
                    <span
                      style={{
                        color: 'white',
                        fontSize: '24px',
                        fontWeight: '800',
                      }}
                    >
                      {grade.voto_generale !== null
                        ? Number.isInteger(grade.voto_generale)
                          ? grade.voto_generale
                          : grade.voto_generale.toFixed(1)
                        : '-'}
                    </span>
                  </div>
                </div>
                {grade.commento && (
                  <p
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      fontStyle: 'italic',
                      margin: 0,
                      paddingLeft: '4px',
                      borderLeft: '2px solid rgba(138, 43, 226, 0.4)',
                      lineHeight: '1.4',
                    }}
                  >
                    {grade.commento}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Note section */}
        {note && (
          <div
            style={{
              marginTop: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px 20px',
              borderLeft: '4px solid #4169e1',
            }}
          >
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '12px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Note
            </p>
            <p
              style={{
                color: 'white',
                fontSize: '14px',
                margin: 0,
                lineHeight: '1.5',
              }}
            >
              {note}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '12px',
              margin: 0,
              fontWeight: '500',
            }}
          >
            Generato automaticamente
          </p>
        </div>
      </div>
    );
  }
);

GradeSheetImage.displayName = 'GradeSheetImage';

export default GradeSheetImage;
