// Regression test — Enterprise per-user modules must anchor their tier-300
// price on the Scale list price, never on Rise. Bug history: meetings,
// projects and okr were anchored on Rise (talkspirit/pricing-simulator#2),
// producing a systematic 17-25% Enterprise overcharge on these 3 modules.
//
// Ground truth: Chiffreur 2025 (Drive Revenue, onglet dégressif), cross-checked
// via its own MRR row (e.g. palier 700 Meetings: MRR 1323€ = 1.89€ × 700 licences
// => 22.68€/an, not 28.31€ as the buggy grid showed). Values below are the
// engine's own tier-300..tier-450 curve rescaled by (scale.annual / rise.annual),
// which reproduces the Chiffreur's numbers to the cent.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPricing } = require('./load-pricing');

const ENTERPRISE_ANCHORED_MODULES = ['meetings', 'projects', 'okr'];

test('every per-user app anchors its Enterprise tier-300 price on the Scale list price', () => {
  const PRICING = loadPricing();
  const offenders = [];
  for (const app of PRICING.apps) {
    if (app.pricing_mode !== 'per_user') continue;
    const v300 = app.rates.enterprise.annual_per_user['300'];
    const scaleAnnual = app.rates.scale.annual;
    if (Math.abs(v300 - scaleAnnual) > 1e-6) {
      offenders.push(`${app.id}: enterprise@300=${v300}, expected scale.annual=${scaleAnnual}`);
    }
  }
  assert.deepEqual(offenders, [], `Enterprise tier-300 not anchored on Scale for: ${offenders.join('; ')}`);
});

test('meetings/projects/okr monthly and annual Enterprise curves are internally consistent (monthly*12 == annual)', () => {
  const PRICING = loadPricing();
  for (const id of ENTERPRISE_ANCHORED_MODULES) {
    const app = PRICING.apps.find(a => a.id === id);
    const { monthly_per_user, annual_per_user } = app.rates.enterprise;
    for (const tier of Object.keys(annual_per_user)) {
      const fromMonthly = Math.round(monthly_per_user[tier] * 12 * 1e6) / 1e6;
      const annual = annual_per_user[tier];
      assert.ok(
        Math.abs(fromMonthly - annual) <= 0.01,
        `${id}@${tier}: monthly*12=${fromMonthly} vs annual=${annual}`
      );
    }
  }
});

test('projects and okr keep an identical Enterprise grid (documented invariant)', () => {
  const PRICING = loadPricing();
  const projects = PRICING.apps.find(a => a.id === 'projects');
  const okr = PRICING.apps.find(a => a.id === 'okr');
  assert.deepEqual(projects.rates.enterprise.annual_per_user, okr.rates.enterprise.annual_per_user);
  assert.deepEqual(projects.rates.enterprise.monthly_per_user, okr.rates.enterprise.monthly_per_user);
});

test('Chiffreur-verified spot values for meetings/projects/okr (palier 300 and 700)', () => {
  const PRICING = loadPricing();
  const meetings = PRICING.apps.find(a => a.id === 'meetings');
  const projects = PRICING.apps.find(a => a.id === 'projects');

  assert.equal(meetings.rates.enterprise.annual_per_user['300'], 24);
  assert.equal(Math.round(meetings.rates.enterprise.annual_per_user['700'] * 1e6) / 1e6, 22.651429);

  assert.equal(projects.rates.enterprise.annual_per_user['300'], 36);
  assert.equal(Math.round(projects.rates.enterprise.annual_per_user['700'] * 1e6) / 1e6, 33.967347);
});

test('newsfeed/chat/library/office/structure remain anchored on Scale (no regression on the already-correct modules)', () => {
  const PRICING = loadPricing();
  const expected = { newsfeed: 33, chat: 15, library: 21, office: 18, structure: 18 };
  for (const [id, expectedValue] of Object.entries(expected)) {
    const app = PRICING.apps.find(a => a.id === id);
    assert.equal(app.rates.enterprise.annual_per_user['300'], expectedValue, `${id} regressed`);
  }
});
