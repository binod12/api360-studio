import { Plus, X } from 'lucide-react';

export interface KeyValueStore {
    key: string;
    value: string;
    enabled: boolean;
}

interface KeyValueEditorProps {
    items: KeyValueStore[];
    onChange: (items: KeyValueStore[]) => void;
    placeholderKey?: string;
    placeholderValue?: string;
}

export function KeyValueEditor({
    items,
    onChange,
    placeholderKey = "Key",
    placeholderValue = "Value"
}: KeyValueEditorProps) {

    const handleUpdate = (index: number, field: keyof KeyValueStore, val: string | boolean) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        onChange(newItems);
    };

    const handleAdd = () => {
        onChange([...items, { key: '', value: '', enabled: true }]);
    };

    const handleRemove = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        if (newItems.length === 0) {
            newItems.push({ key: '', value: '', enabled: true }); // Always keep at least one empty row
        }
        onChange(newItems);
    };

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => handleUpdate(index, 'enabled', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-blue)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                        <input
                            type="text"
                            placeholder={placeholderKey}
                            value={item.key}
                            onChange={(e) => handleUpdate(index, 'key', e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '0.85rem', borderRight: '1px solid var(--border-color)' }}
                        />
                        <input
                            type="text"
                            placeholder={placeholderValue}
                            value={item.value}
                            onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                    </div>
                    <button
                        onClick={() => handleRemove(index)}
                        style={{ color: 'var(--text-muted)', padding: '4px' }}
                        title="Remove row"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            <div style={{ marginTop: '8px' }}>
                <button
                    onClick={handleAdd}
                    className="flex-center"
                    style={{ gap: '6px', color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 500, padding: '4px 8px', borderRadius: '4px' }}
                >
                    <Plus size={14} /> Add new row
                </button>
            </div>
        </div>
    );
}
