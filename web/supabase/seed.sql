-- Generado por scripts/seed-sql.ts desde src/data/seed.ts. No editar a mano.

insert into public.drops (id, slug, number, name, copy, draft, announce_at, key_opens_at, opens_at, archived_at) values
  ('10000000-0000-4000-8000-000000000001', 'first-signal', '01', 'FIRST SIGNAL', 'El primer lavado. Patrones de la lavandería sobre las piezas base de la marca.', false, '2026-10-01T10:00:00Z', null, '2026-11-01T19:00:00Z', null),
  ('10000000-0000-4000-8000-000000000002', 'visual-pack-001', '02', 'VISUAL PACK 001', 'Texturas y textiles para colgar o para coser. Se abre cuando termine el centrifugado.', false, '2026-11-01T10:00:00Z', null, '2026-12-12T19:00:00Z', null),
  ('10000000-0000-4000-8000-000000000003', 'locked-drop', '03', 'LOCKED DROP', 'Solo con llave. Las llaves se reparten antes de cada drop, a quien esté dentro.', false, '2026-11-10T10:00:00Z', '2026-11-10T10:00:00Z', '2027-01-20T19:00:00Z', null),
  ('10000000-0000-4000-8000-000000000004', 'next-chapter', '04', 'NEXT CHAPTER', 'Todavía en el tambor.', true, null, null, null, null);

insert into public.artworks (id, slug, name, kind, story, pattern) values
  ('20000000-0000-4000-8000-000000000001', 'ajedrez-lavanderia', 'Ajedrez Lavandería', 'patron', 'El suelo de la lavandería convertido en repetición. Cuadros de 1 cm, negro y crema.', '{"motif":"checker","colors":["#1a1a1e","#ebe5d9"],"scale":8}'::jsonb),
  ('20000000-0000-4000-8000-000000000002', 'pompa-repeat', 'Pompa Repeat', 'patron', 'Pompas iridiscentes en repetición continua: el patrón de Pompa.', '{"motif":"bubbles","colors":["#e8e0d0","#9be7ff","#c9a7ff","#ffb3d9"],"scale":22}'::jsonb),
  ('20000000-0000-4000-8000-000000000003', 'espuma', 'Espuma', 'textura', 'Textura de espuma de jabón escaneada a 1200 ppp y llevada a dos tintas.', '{"motif":"dots","colors":["#f2f0eb","#cfdcea"],"scale":6}'::jsonb),
  ('20000000-0000-4000-8000-000000000004', 'ruido-centrifugado', 'Ruido Centrifugado', 'textura', 'La vibración de una lavadora a 1400 rpm, dibujada en ondas.', '{"motif":"waves","colors":["#1a1a1e","#c9a7ff"],"scale":12}'::jsonb),
  ('20000000-0000-4000-8000-000000000005', 'toalla-rizo', 'Toalla Rizo', 'textil', 'Rizo americano de toalla de baño, tejido en algodón peinado.', '{"motif":"loops","colors":["#e8e0d0","#c9b99a"],"scale":6}'::jsonb),
  ('20000000-0000-4000-8000-000000000006', 'sabana-tendida', 'Sábana Tendida', 'textil', 'Raya de sábana de hotel, tejida en tafetán de algodón.', '{"motif":"stripes","colors":["#f2f0eb","#9be7ff"],"scale":10}'::jsonb);

insert into public.supports (id, slug, name, category, options, wear) values
  ('30000000-0000-4000-8000-000000000001', 'hoodie', 'Hoodie', 'prenda', array['talla']::text[], '{"slot":"top","kind":"hoodie"}'::jsonb),
  ('30000000-0000-4000-8000-000000000002', 'tee', 'Camiseta', 'prenda', array['talla']::text[], '{"slot":"top","kind":"tee"}'::jsonb),
  ('30000000-0000-4000-8000-000000000003', 'gorro', 'Gorro', 'accesorio', array['talla']::text[], '{"slot":"head","kind":"beanie"}'::jsonb),
  ('30000000-0000-4000-8000-000000000004', 'lamina', 'Lámina', 'arte', array['medida', 'papel']::text[], null),
  ('30000000-0000-4000-8000-000000000005', 'tela-metro', 'Tela por metro', 'textil', array['tejido', 'largo']::text[], null),
  ('30000000-0000-4000-8000-000000000006', 'panuelo', 'Pañuelo', 'accesorio', array['medida']::text[], null);

insert into public.products (id, slug, drop_id, artwork_id, support_id, name, description, care, color) values
  ('40000000-0000-4000-8000-000000000001', 'hoodie-ajedrez-lavanderia', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Hoodie Ajedrez Lavandería', 'Algodón grueso 400 g, corte boxy. Patrón Ajedrez Lavandería estampado en serigrafía en la espalda.', 'Lavar del revés a 30 °C. No usar secadora.', '#1a1a1e'),
  ('40000000-0000-4000-8000-000000000002', 'tee-pompa-repeat', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Tee Pompa Repeat', 'Camiseta 240 g lavada a la piedra con el patrón Pompa Repeat a todo el cuerpo.', 'Lavar del revés a 30 °C.', '#e8e0d0'),
  ('40000000-0000-4000-8000-000000000003', 'gorro-espuma', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Gorro Espuma', 'Punto acanalado con pompón y la textura Espuma tejida en jacquard.', 'Lavar a mano en frío.', '#b9a3f5'),
  ('40000000-0000-4000-8000-000000000004', 'lamina-ruido-centrifugado', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'Lámina Ruido Centrifugado', 'Impresión giclée sobre papel de algodón 310 g. Edición firmada.', 'Enmarcar lejos de la luz directa.', '#1a1a1e'),
  ('40000000-0000-4000-8000-000000000005', 'tela-toalla-rizo', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Tela Toalla Rizo', 'Rizo de algodón peinado de 150 cm de ancho, cortado a medida.', 'Lavar a 40 °C. Encoge un 3 %.', '#e8e0d0'),
  ('40000000-0000-4000-8000-000000000006', 'panuelo-ajedrez-lavanderia', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', 'Pañuelo Ajedrez Lavandería', 'Twill de seda con el patrón Ajedrez y dobladillo a mano.', 'Limpieza en seco.', '#ebe5d9'),
  ('40000000-0000-4000-8000-000000000007', 'lamina-sabana-tendida', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000004', 'Lámina Sábana Tendida', 'Impresión giclée sobre papel de algodón 310 g.', 'Enmarcar lejos de la luz directa.', '#f2f0eb'),
  ('40000000-0000-4000-8000-000000000008', 'tela-sabana-tendida', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000005', 'Tela Sábana Tendida', 'Tafetán de algodón de 150 cm de ancho con la raya Sábana Tendida.', 'Lavar a 40 °C.', '#f2f0eb'),
  ('40000000-0000-4000-8000-000000000009', 'hoodie-pompa-repeat', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Hoodie Pompa Repeat', 'La hoodie del drop con llave, con Pompa Repeat bordado.', 'Lavar del revés a 30 °C.', '#2a2a30');

insert into public.variants (id, product_id, sku, options, price_cents, stock) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'SBX-HOOAJELAV-S', '{"talla":"S"}'::jsonb, 6500, 3),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'SBX-HOOAJELAV-M', '{"talla":"M"}'::jsonb, 6500, 5),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'SBX-HOOAJELAV-L', '{"talla":"L"}'::jsonb, 6500, 2),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'SBX-HOOAJELAV-XL', '{"talla":"XL"}'::jsonb, 6500, 0),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000002', 'SBX-TEEPOMREP-S', '{"talla":"S"}'::jsonb, 3500, 8),
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000002', 'SBX-TEEPOMREP-M', '{"talla":"M"}'::jsonb, 3500, 6),
  ('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000002', 'SBX-TEEPOMREP-L', '{"talla":"L"}'::jsonb, 3500, 1),
  ('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000002', 'SBX-TEEPOMREP-XL', '{"talla":"XL"}'::jsonb, 3500, 4),
  ('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000003', 'SBX-GORESP-NICA', '{"talla":"ÚNICA"}'::jsonb, 2500, 7),
  ('50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000004', 'SBX-LAMRUICEN-A3-ALGODN310G', '{"medida":"A3","papel":"Algodón 310 g"}'::jsonb, 3500, 10),
  ('50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000004', 'SBX-LAMRUICEN-50×70-ALGODN310G', '{"medida":"50×70","papel":"Algodón 310 g"}'::jsonb, 6500, 5),
  ('50000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000005', 'SBX-TELTOARIZ-RIZOALGODN-1M', '{"tejido":"Rizo algodón","largo":"1 m"}'::jsonb, 2800, 20),
  ('50000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000005', 'SBX-TELTOARIZ-RIZOALGODN-3M', '{"tejido":"Rizo algodón","largo":"3 m"}'::jsonb, 7900, 6),
  ('50000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000006', 'SBX-PANAJELAV-55×55', '{"medida":"55×55"}'::jsonb, 4500, 0),
  ('50000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000007', 'SBX-LAMSABTEN-A3-ALGODN310G', '{"medida":"A3","papel":"Algodón 310 g"}'::jsonb, 3500, 15),
  ('50000000-0000-4000-8000-000000000016', '40000000-0000-4000-8000-000000000008', 'SBX-TELSABTEN-TAFETNALGODN-1M', '{"tejido":"Tafetán algodón","largo":"1 m"}'::jsonb, 2600, 30),
  ('50000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000009', 'SBX-HOOPOMREP-S', '{"talla":"S"}'::jsonb, 7000, 5),
  ('50000000-0000-4000-8000-000000000018', '40000000-0000-4000-8000-000000000009', 'SBX-HOOPOMREP-M', '{"talla":"M"}'::jsonb, 7000, 5),
  ('50000000-0000-4000-8000-000000000019', '40000000-0000-4000-8000-000000000009', 'SBX-HOOPOMREP-L', '{"talla":"L"}'::jsonb, 7000, 5);
