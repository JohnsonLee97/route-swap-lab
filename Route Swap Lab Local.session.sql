SELECT
  t.id AS trial_id,
  t.previous_trial_id AS rematch_of,
  ra.name AS traveller_a_route,
  TIMESTAMPDIFF(SECOND, a.departed_at, a.arrived_at) AS a_time_seconds,
  rb.name AS traveller_b_route,
  TIMESTAMPDIFF(SECOND, b.departed_at, b.arrived_at) AS b_time_seconds,
  ABS(
    TIMESTAMPDIFF(SECOND, a.departed_at, a.arrived_at)
    - TIMESTAMPDIFF(SECOND, b.departed_at, b.arrived_at)
  ) AS time_difference_seconds
FROM trials AS t
JOIN routes AS ra ON ra.id = t.route_a_id
JOIN routes AS rb ON rb.id = t.route_b_id
LEFT JOIN trips AS a ON a.trial_id = t.id AND a.traveller = 'A'
LEFT JOIN trips AS b ON b.trial_id = t.id AND b.traveller = 'B'
ORDER BY t.id ASC;