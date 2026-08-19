const CHANNELS = new Set(['alpha', 'beta', 'stable']);

export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) throw new Error(`Invalid stable version: ${version}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw: match[0] };
}

export function parseReleaseTag(tag) {
  const match = /^v(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta)\.(\d+))?$/.exec(String(tag).trim());
  if (!match) return null;
  return {
    version: `${match[1]}.${match[2]}.${match[3]}`,
    channel: match[4] || 'stable',
    number: match[5] ? Number(match[5]) : null,
    tag: match[0],
  };
}

export function releasesFor(tags, version, channel) {
  if (!CHANNELS.has(channel)) throw new Error(`Unknown channel: ${channel}`);
  return tags.map(parseReleaseTag).filter(Boolean).filter(item => item.version === version && item.channel === channel);
}

function contiguousCount(releases, channel) {
  const numbers = [...new Set(releases.map(item => item.number).filter(Number.isInteger))].sort((a,b) => a-b);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) throw new Error(`${channel} release sequence has a gap before ${numbers[i]}`);
  }
  return numbers.length;
}

export function channelStatus({ tags, version, alphasPerBeta = 5, betasPerStable = 3 }) {
  parseVersion(version);
  const alphas = releasesFor(tags, version, 'alpha');
  const betas = releasesFor(tags, version, 'beta');
  const stable = releasesFor(tags, version, 'stable');
  const alphaMax = contiguousCount(alphas, 'alpha');
  const betaMax = contiguousCount(betas, 'beta');
  return {
    version,
    alphaCount: alphas.length,
    betaCount: betas.length,
    stableCount: stable.length,
    nextAlpha: alphaMax + 1,
    nextBeta: betaMax + 1,
    alphaPromotionReady: alphaMax >= alphasPerBeta,
    stablePromotionReady: betaMax >= betasPerStable,
    alphasPerBeta,
    betasPerStable,
  };
}

export function nextTag({ tags, version, channel, alphasPerBeta = 5, betasPerStable = 3 }) {
  const status = channelStatus({ tags, version, alphasPerBeta, betasPerStable });
  if (status.stableCount > 0) throw new Error(`v${version} is already stable`);
  if (channel === 'alpha') {
    if (status.alphaPromotionReady) throw new Error(`alpha threshold reached for v${version}; promote to beta before cutting more alphas`);
    return `v${version}-alpha.${status.nextAlpha}`;
  }
  if (channel === 'beta') {
    if (!status.alphaPromotionReady) throw new Error(`need ${alphasPerBeta} alpha releases before beta`);
    if (status.stablePromotionReady) throw new Error(`beta threshold reached for v${version}; promote to stable`);
    return `v${version}-beta.${status.nextBeta}`;
  }
  if (channel === 'stable') {
    if (!status.stablePromotionReady) throw new Error(`need ${betasPerStable} beta releases before stable`);
    return `v${version}`;
  }
  throw new Error(`Unknown channel: ${channel}`);
}

export function assertPromotion({ tags, version, from, to, alphasPerBeta = 5, betasPerStable = 3 }) {
  const status = channelStatus({ tags, version, alphasPerBeta, betasPerStable });
  if (from === 'alpha' && to === 'beta') {
    if (!status.alphaPromotionReady) throw new Error(`promotion blocked: ${status.alphaCount}/${alphasPerBeta} alpha releases`);
    return true;
  }
  if (from === 'beta' && to === 'stable') {
    if (!status.stablePromotionReady) throw new Error(`promotion blocked: ${status.betaCount}/${betasPerStable} beta releases`);
    return true;
  }
  throw new Error(`Unsupported promotion ${from} -> ${to}`);
}
