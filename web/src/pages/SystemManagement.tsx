import { useState } from 'react';
import { useApp } from '@saanpaw/shared';
import { Badge, Banner, Button, Card, CardHead, Toggle } from '@/components/ui';

/** Developer Module - Configuration, database counts, and maintenance controls. */
export function SystemManagementPage() {
  const { reports, users, shelters, shelterAnimals, cases, flags, notifications, messages } = useApp();

  const [maintenance, setMaintenance] = useState(false);
  const [aiModeration, setAiModeration] = useState(true);
  const [smartAlerts, setSmartAlerts] = useState(true);
  const [geoFence, setGeoFence] = useState(true);

  const collections = [
    { name: 'reports', count: reports.length },
    { name: 'users', count: users.length },
    { name: 'shelters', count: shelters.length },
    { name: 'shelterAnimals', count: shelterAnimals.length },
    { name: 'animalCases', count: cases.length },
    { name: 'moderationFlags', count: flags.length },
    { name: 'notifications', count: notifications.length },
    { name: 'messages', count: messages.length },
  ];

  return (
    <>
      {maintenance ? (
        <Banner tone="danger" title="Maintenance mode is ON">
          Users and shelter admins cannot sign in to the mobile app. Turn this off once the
          deployment finishes.
        </Banner>
      ) : (
        <Banner tone="success" title="All systems operational">
          API, database, and smart alert dispatch are healthy.
        </Banner>
      )}

      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <CardHead title="System configuration" />
            <div className="card-pad">
              <Toggle
                on={aiModeration}
                onChange={setAiModeration}
                label="AI report moderation"
                hint="Auto-flag false and inappropriate reports for review."
              />
              <Toggle
                on={smartAlerts}
                onChange={setSmartAlerts}
                label="Smart alert dispatch"
                hint="Notify users and shelters when a report lands inside their radius."
              />
              <Toggle
                on={geoFence}
                onChange={setGeoFence}
                label="San Jose Del Monte geo-fence"
                hint="Reject any report pinned outside the city boundary (Limitation 1)."
              />
              <Toggle
                on={maintenance}
                onChange={setMaintenance}
                label="Maintenance mode"
                hint="Block user and shelter sign-in while updates are deployed."
              />
            </div>
          </Card>

          <Card>
            <CardHead title="Database monitoring" sub="Document counts per collection" />
            <table>
              <thead>
                <tr>
                  <th>Collection</th>
                  <th style={{ width: 120 }}>Documents</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.name}>
                    <td style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5 }}>
                      {c.name}
                    </td>
                    <td style={{ fontWeight: 700 }}>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHead title="Maintenance actions" />
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row row-wrap">
                <Button variant="secondary">Check for software updates</Button>
                <Button variant="secondary">Rebuild image-recognition index</Button>
                <Button variant="secondary">Export system report (CSV)</Button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                These call the backend maintenance endpoints once the API is connected.
              </p>
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <CardHead title="Deployment" />
            <div className="card-pad">
              <dl className="kv" style={{ gridTemplateColumns: '132px 1fr' }}>
                <dt>Environment</dt>
                <dd>Development</dd>
                <dt>Console version</dt>
                <dd>0.1.0</dd>
                <dt>Mobile app</dt>
                <dd>0.1.0</dd>
                <dt>Service area</dt>
                <dd>San Jose Del Monte, Bulacan</dd>
                <dt>Data source</dt>
                <dd>Shared in-memory store</dd>
              </dl>
              <div className="row row-wrap" style={{ marginTop: 14 }}>
                <Badge label="Console ready" />
                <Badge label="API not connected" color="var(--accent)" soft="var(--accent-soft)" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Architecture" />
            <div className="card-pad" style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 10 }}>
                The Developer Module runs here as a web console, separate from the mobile app. Pet
                owners and shelter admins use the mobile app only; administration is not available
                on a phone.
              </p>
              <p>
                Both surfaces share <code>@saanpaw/shared</code> &mdash; the data model, the service
                area, the matching logic, and the colour language &mdash; so they cannot drift apart.
              </p>
            </div>
          </Card>

          <Card>
            <CardHead title="Limitations enforced in code" />
            <div className="card-pad">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.7 }}>
                <li>Operates only within San Jose Del Monte, Bulacan &mdash; every report coordinate is geo-fenced.</li>
                <li>No physical tracking hardware &mdash; no GPS collars, RFID tags, or microchips.</li>
                <li>No integration with national government animal databases.</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
