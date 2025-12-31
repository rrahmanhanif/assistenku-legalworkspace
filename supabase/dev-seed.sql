-- Dev-only seed, jangan pakai di produksi
INSERT INTO registry (role, doc_type, doc_number, scope, email, name)
VALUES
  ('CLIENT', 'IPL', 'IPL-DEV-001', 'PROJECT-ALPHA', 'client@example.com', 'Client Dev'),
  ('MITRA', 'SPL', 'SPL-DEV-001', 'PROJECT-ALPHA', 'mitra@example.com', 'Mitra Dev')
ON CONFLICT (role, doc_number) DO NOTHING;

INSERT INTO overtime_policy (scope, weekend_allowed, holiday_allowed, max_hours_per_day)
VALUES ('PROJECT-ALPHA', false, false, 4)
ON CONFLICT DO NOTHING;
