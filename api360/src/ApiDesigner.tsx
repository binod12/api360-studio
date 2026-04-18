import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ApiDesignerProps {
  value: string;
  onChange: (val: string) => void;
}

export function ApiDesigner({ value, onChange }: ApiDesignerProps) {
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<any[]>([]);

  // We can add simple Ajv or custom lint logic in the editor validation
  const handleEditorValidation = (markers: any[]) => {
    // Monaco has built in JSON/YAML linting
    setErrors(markers);
    setIsValid(markers.length === 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
          <Layers size={18} color="var(--accent-blue)" /> OpenAPI Designer
        </div>
        
        <div style={{ flex: 1 }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: isValid ? 'var(--status-success)' : 'var(--status-warning)' }}>
          {isValid ? (
            <><CheckCircle2 size={16} /> Valid Specification</>
          ) : (
            <><AlertTriangle size={16} /> {errors.length} Errors detected</>
          )}
        </div>
      </div>

      <PanelGroup direction="horizontal" style={{ flex: 1 }}>
        <Panel defaultSize={50} minSize={20}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)' }}>
            <div style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              YAML / JSON EDITOR
            </div>
            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={value}
                onChange={(val) => onChange(val || '')}
                onValidate={handleEditorValidation}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  padding: { top: 16 }
                }}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle-vertical" style={{ width: '4px', cursor: 'col-resize' }}>
          <div style={{ width: '1px', height: '100%', background: 'var(--border-color)', margin: '0 auto' }} />
        </PanelResizeHandle>

        <Panel defaultSize={50} minSize={20}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
             <div style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              VISUAL BUILDER (PREVIEW)
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
               <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>
                 Visual Builder layout mapping is active. Edit the JSON on the left to see dynamic form updates.
               </div>
               
               {/* Extremely simple visual preview parser */}
               {(() => {
                 try {
                   const spec = JSON.parse(value);
                   return (
                     <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                       <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                         <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{spec?.info?.title || 'Untitled API'}</h2>
                         <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Version: {spec?.info?.version || '1.0.0'}</p>
                       </div>
                       
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         {Object.entries(spec?.paths || {}).map(([path, methods]: [string, any]) => (
                           <div key={path} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                             <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                               {path}
                             </div>
                             <div style={{ padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                               {Object.keys(methods).map(m => (
                                 <span key={m} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: `var(--method-${m.toUpperCase()})`, color: '#fff', textTransform: 'uppercase' }}>
                                   {m}
                                 </span>
                               ))}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )
                 } catch {
                   return <div style={{ color: 'var(--status-error)', marginTop: '20px', textAlign: 'center' }}>Invalid JSON</div>
                 }
               })()}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
