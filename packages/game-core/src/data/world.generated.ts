/**
 * ============================================================================================
 *  GERADO — não edite à mão.
 * ============================================================================================
 *
 * Fonte: economy/economy.csv@sha256:ac04886e3fee + economy/expansions.csv@sha256:d11a34f1fd8b
 * Gerador: economy/gen/generate.mjs · regenerar: `pnpm econ:gen` · conferir: `pnpm econ:check`
 * Justificativa: docs/economia/decisoes.md (proposta v2 — aguardando aprovação).
 *
 * Contrato: `WorldData` em ./types.ts. SÓ DADOS: o motor ainda não tem expansão, nós de recurso
 * nem desbloqueio de cultura (pendência do game-core).
 */
import type { WorldData } from "./types";

export const world: WorldData = {
  meta: {"version":"v2","placeholder":false,"source":"economy/economy.csv@sha256:ac04886e3fee + economy/expansions.csv@sha256:d11a34f1fd8b"},
  islands: {
    homestead: {"id":"homestead","order":1,"blockIds":["homestead_01","homestead_02","homestead_03","homestead_04","homestead_05","homestead_06","homestead_07","homestead_08","homestead_09","homestead_10"],"crossingCost":{}},
    breezewood: {"id":"breezewood","order":2,"blockIds":["breezewood_01","breezewood_02","breezewood_03","breezewood_04","breezewood_05","breezewood_06","breezewood_07","breezewood_08"],"crossingCost":{"glintstone":10}},
    ochremesa: {"id":"ochremesa","order":3,"blockIds":["ochremesa_01","ochremesa_02","ochremesa_03","ochremesa_04","ochremesa_05","ochremesa_06","ochremesa_07"],"crossingCost":{"dewquartz":20}},
    emberpeak: {"id":"emberpeak","order":4,"blockIds":["emberpeak_01","emberpeak_02","emberpeak_03","emberpeak_04","emberpeak_05"],"crossingCost":{"sandglint":200}},
  },
  blockOrder: ["homestead_01","homestead_02","homestead_03","homestead_04","homestead_05","homestead_06","homestead_07","homestead_08","homestead_09","homestead_10","breezewood_01","breezewood_02","breezewood_03","breezewood_04","breezewood_05","breezewood_06","breezewood_07","breezewood_08","ochremesa_01","ochremesa_02","ochremesa_03","ochremesa_04","ochremesa_05","ochremesa_06","ochremesa_07","emberpeak_01","emberpeak_02","emberpeak_03","emberpeak_04","emberpeak_05"],
  blocks: {
    homestead_01: {"id":"homestead_01","islandId":"homestead","order":1,"buildSeconds":0,"minLevel":1,"minAccountDays":0,"cost":{"gold":"0","items":{}},"adds":{"plots":6,"nodes":{"tree":3,"flint_rock":2}},"unlocksCrops":["mintleaf","dewcress","pebblepea"]},
    homestead_02: {"id":"homestead_02","islandId":"homestead","order":2,"buildSeconds":5,"minLevel":1,"minAccountDays":0,"cost":{"gold":"0","items":{"driftwood":3}},"adds":{"plots":3,"nodes":{"tree":1}},"unlocksCrops":["curlwort","sweetstalk"]},
    homestead_03: {"id":"homestead_03","islandId":"homestead","order":3,"buildSeconds":5,"minLevel":1,"minAccountDays":0,"cost":{"gold":"60","items":{"driftwood":5}},"adds":{"plots":4,"nodes":{"tree":1,"flint_rock":1}},"unlocksCrops":["puffbean","redroot"]},
    homestead_04: {"id":"homestead_04","islandId":"homestead","order":4,"buildSeconds":60,"minLevel":2,"minAccountDays":0,"cost":{"gold":"60","items":{"flint":1}},"adds":{"plots":4,"nodes":{"rustite_node":1}},"unlocksCrops":["honeyleek"]},
    homestead_05: {"id":"homestead_05","islandId":"homestead","order":5,"buildSeconds":300,"minLevel":3,"minAccountDays":0,"cost":{"gold":"100","items":{"flint":3}},"adds":{"plots":4,"nodes":{"flint_rock":1,"glintstone_node":1}},"unlocksCrops":["stripemelon"]},
    homestead_06: {"id":"homestead_06","islandId":"homestead","order":6,"buildSeconds":900,"minLevel":5,"minAccountDays":0,"cost":{"gold":"50","items":{"rustite":1}},"adds":{"plots":4,"nodes":{"tree":1,"rustite_node":1}},"unlocksCrops":["glowgourd"]},
    homestead_07: {"id":"homestead_07","islandId":"homestead","order":7,"buildSeconds":2700,"minLevel":6,"minAccountDays":0,"cost":{"gold":"70","items":{"rustite":1}},"adds":{"plots":2,"nodes":{"tree":1,"flint_rock":1}},"unlocksCrops":[]},
    homestead_08: {"id":"homestead_08","islandId":"homestead","order":8,"buildSeconds":3600,"minLevel":8,"minAccountDays":0,"cost":{"gold":"80","items":{"rustite":1,"glintstone":1}},"adds":{"plots":2,"nodes":{"flint_rock":1,"glintstone_node":1}},"unlocksCrops":[]},
    homestead_09: {"id":"homestead_09","islandId":"homestead","order":9,"buildSeconds":14400,"minLevel":10,"minAccountDays":0,"cost":{"gold":"120","items":{"driftwood":40,"flint":15,"rustite":2}},"adds":{"plots":2,"nodes":{"tree":1,"rustite_node":1}},"unlocksCrops":[]},
    homestead_10: {"id":"homestead_10","islandId":"homestead","order":10,"buildSeconds":36000,"minLevel":11,"minAccountDays":0,"cost":{"gold":"180","items":{"driftwood":60,"flint":25,"rustite":3}},"adds":{"plots":0,"nodes":{"tree":1,"flint_rock":1,"rustite_node":1}},"unlocksCrops":[]},
    breezewood_01: {"id":"breezewood_01","islandId":"breezewood","order":11,"buildSeconds":60,"minLevel":11,"minAccountDays":1,"cost":{"gold":"100","items":{"driftwood":20}},"adds":{"plots":2,"nodes":{"tree":2,"flint_rock":2,"rustite_node":1,"glintstone_node":1,"bellpear_tree":3}},"unlocksCrops":["bluepod"]},
    breezewood_02: {"id":"breezewood_02","islandId":"breezewood","order":12,"buildSeconds":300,"minLevel":13,"minAccountDays":0,"cost":{"gold":"200","items":{"driftwood":10,"flint":5,"glintstone":2}},"adds":{"plots":0,"nodes":{"tree":1,"flint_rock":1,"mistplum_tree":1}},"unlocksCrops":["frillhead"]},
    breezewood_03: {"id":"breezewood_03","islandId":"breezewood","order":13,"buildSeconds":1800,"minLevel":16,"minAccountDays":0,"cost":{"gold":"300","items":{"driftwood":30,"flint":20,"rustite":5,"bellpear":15}},"adds":{"plots":2,"nodes":{"tree":1,"flint_rock":1,"dewquartz_node":1}},"unlocksCrops":["sunbulb"]},
    breezewood_04: {"id":"breezewood_04","islandId":"breezewood","order":14,"buildSeconds":14400,"minLevel":23,"minAccountDays":0,"cost":{"gold":"900","items":{"driftwood":70,"glintstone":5,"dewquartz":1,"bellpear":15,"mistplum":15}},"adds":{"plots":2,"nodes":{"tree":1,"flint_rock":1,"rustite_node":1,"glintstone_node":1,"bellpear_tree":1,"mistplum_tree":1}},"unlocksCrops":[]},
    breezewood_05: {"id":"breezewood_05","islandId":"breezewood","order":15,"buildSeconds":43200,"minLevel":27,"minAccountDays":0,"cost":{"gold":"1000","items":{"driftwood":100,"flint":35,"glintstone":5,"dewquartz":4,"bellpear":15,"mistplum":15}},"adds":{"plots":2,"nodes":{"tree":1,"flint_rock":1,"rustite_node":1,"glintstone_node":1,"bellpear_tree":1,"mistplum_tree":1}},"unlocksCrops":["silkpod"]},
    breezewood_06: {"id":"breezewood_06","islandId":"breezewood","order":16,"buildSeconds":86400,"minLevel":32,"minAccountDays":0,"cost":{"gold":"1000","items":{"driftwood":100,"flint":25,"rustite":15,"glintstone":10,"dewquartz":3,"bellpear":30,"mistplum":30}},"adds":{"plots":2,"nodes":{"tree":1,"flint_rock":1,"rustite_node":1,"mistplum_tree":1}},"unlocksCrops":[]},
    breezewood_07: {"id":"breezewood_07","islandId":"breezewood","order":17,"buildSeconds":86400,"minLevel":36,"minAccountDays":0,"cost":{"gold":"500","items":{"driftwood":100,"flint":10,"dewquartz":5,"bellpear":15,"mistplum":15}},"adds":{"plots":2,"nodes":{"bellpear_tree":1}},"unlocksCrops":["crownbloom"]},
    breezewood_08: {"id":"breezewood_08","islandId":"breezewood","order":18,"buildSeconds":172800,"minLevel":43,"minAccountDays":0,"cost":{"gold":"1000","items":{"driftwood":250,"flint":20,"rustite":10,"glintstone":10,"dewquartz":13,"bellpear":30,"mistplum":30}},"adds":{"plots":2,"nodes":{"tree":2,"flint_rock":1,"rustite_node":1,"glintstone_node":1,"dewquartz_node":1,"mistplum_tree":1}},"unlocksCrops":[]},
    ochremesa_01: {"id":"ochremesa_01","islandId":"ochremesa","order":19,"buildSeconds":2160,"minLevel":41,"minAccountDays":5,"cost":{"gold":"1500","items":{"driftwood":300,"flint":50,"rustite":25,"glintstone":15,"bellpear":10,"mistplum":5}},"adds":{"plots":3,"nodes":{"flint_rock":1,"rustite_node":1,"dewquartz_node":1,"sandglint_node":1,"honeydate_palm":1}},"unlocksCrops":["sandspud"]},
    ochremesa_02: {"id":"ochremesa_02","islandId":"ochremesa","order":20,"buildSeconds":43200,"minLevel":44,"minAccountDays":0,"cost":{"gold":"1384","items":{"driftwood":300,"flint":65,"rustite":20,"glintstone":15,"dewquartz":21,"sandglint":20,"bellpear":30,"mistplum":30,"honeydate":45}},"adds":{"plots":3,"nodes":{"tree":1,"flint_rock":1,"rustite_node":1}},"unlocksCrops":["duneroot"]},
    ochremesa_03: {"id":"ochremesa_03","islandId":"ochremesa","order":21,"buildSeconds":172800,"minLevel":50,"minAccountDays":0,"cost":{"gold":"5376","items":{"driftwood":450,"flint":225,"rustite":30,"glintstone":25,"dewquartz":54,"sandglint":100,"bellpear":40,"mistplum":40,"honeydate":55}},"adds":{"plots":3,"nodes":{"tree":1,"honeydate_palm":1}},"unlocksCrops":[]},
    ochremesa_04: {"id":"ochremesa_04","islandId":"ochremesa","order":22,"buildSeconds":302400,"minLevel":58,"minAccountDays":0,"cost":{"gold":"11520","items":{"driftwood":750,"flint":275,"rustite":50,"glintstone":35,"dewquartz":81,"sandglint":225,"bellpear":45,"mistplum":45,"honeydate":60}},"adds":{"plots":3,"nodes":{"tree":1,"flint_rock":1,"sandglint_node":1}},"unlocksCrops":["miragemelon"]},
    ochremesa_05: {"id":"ochremesa_05","islandId":"ochremesa","order":23,"buildSeconds":388800,"minLevel":65,"minAccountDays":0,"cost":{"gold":"19200","items":{"driftwood":1200,"flint":350,"rustite":75,"glintstone":45,"dewquartz":108,"sandglint":475,"bellpear":60,"mistplum":60,"honeydate":75}},"adds":{"plots":4,"nodes":{"glintstone_node":1,"honeydate_palm":1}},"unlocksCrops":[]},
    ochremesa_06: {"id":"ochremesa_06","islandId":"ochremesa","order":24,"buildSeconds":518400,"minLevel":72,"minAccountDays":0,"cost":{"gold":"26880","items":{"driftwood":1675,"flint":550,"rustite":100,"glintstone":85,"dewquartz":135,"sandglint":1050,"bellpear":60,"mistplum":60,"honeydate":75}},"adds":{"plots":1,"nodes":{"tree":2,"flint_rock":1,"rustite_node":1,"sandglint_node":1,"honeydate_palm":1}},"unlocksCrops":["starthistle"]},
    ochremesa_07: {"id":"ochremesa_07","islandId":"ochremesa","order":25,"buildSeconds":648000,"minLevel":75,"minAccountDays":0,"cost":{"gold":"34560","items":{"driftwood":2100,"flint":900,"rustite":140,"glintstone":130,"dewquartz":165,"sandglint":1700,"bellpear":70,"mistplum":70,"honeydate":85}},"adds":{"plots":3,"nodes":{"flint_rock":1,"dewquartz_node":1}},"unlocksCrops":[]},
    emberpeak_01: {"id":"emberpeak_01","islandId":"emberpeak","order":26,"buildSeconds":12910,"minLevel":78,"minAccountDays":30,"cost":{"gold":"4724","items":{"driftwood":1450,"flint":575,"rustite":160,"glintstone":90,"dewquartz":40,"sandglint":300,"bellpear":35,"mistplum":35,"honeydate":110}},"adds":{"plots":0,"nodes":{"glintstone_node":1,"cinderite_node":1,"firefig_tree":1}},"unlocksCrops":["cinderpod"]},
    emberpeak_02: {"id":"emberpeak_02","islandId":"emberpeak","order":27,"buildSeconds":216000,"minLevel":88,"minAccountDays":0,"cost":{"gold":"24120","items":{"driftwood":3050,"flint":1050,"rustite":160,"glintstone":160,"dewquartz":140,"sandglint":600,"cinderite":6,"bellpear":140,"mistplum":140,"honeydate":205,"firefig":205}},"adds":{"plots":0,"nodes":{"cinderite_node":1,"firefig_tree":1}},"unlocksCrops":["ashbloom"]},
    emberpeak_03: {"id":"emberpeak_03","islandId":"emberpeak","order":28,"buildSeconds":604800,"minLevel":98,"minAccountDays":0,"cost":{"gold":"62640","items":{"driftwood":3850,"flint":1300,"rustite":205,"glintstone":180,"dewquartz":240,"sandglint":1000,"cinderite":28,"bellpear":170,"mistplum":170,"honeydate":250,"firefig":250}},"adds":{"plots":0,"nodes":{"sandglint_node":1}},"unlocksCrops":["magmabulb"]},
    emberpeak_04: {"id":"emberpeak_04","islandId":"emberpeak","order":29,"buildSeconds":907200,"minLevel":108,"minAccountDays":0,"cost":{"gold":"148800","items":{"driftwood":4750,"flint":1825,"rustite":260,"glintstone":175,"dewquartz":344,"sandglint":1200,"cinderite":52,"bellpear":180,"mistplum":180,"honeydate":270,"firefig":270}},"adds":{"plots":0,"nodes":{"rustite_node":1,"dewquartz_node":1,"cinderite_node":1,"firefig_tree":1}},"unlocksCrops":[]},
    emberpeak_05: {"id":"emberpeak_05","islandId":"emberpeak","order":30,"buildSeconds":1166400,"minLevel":120,"minAccountDays":0,"cost":{"gold":"252000","items":{"driftwood":6450,"flint":2450,"rustite":330,"glintstone":205,"dewquartz":510,"sandglint":1500,"cinderite":150,"bellpear":215,"mistplum":215,"honeydate":325,"firefig":325}},"adds":{"plots":0,"nodes":{}},"unlocksCrops":["embercrown"]},
  },
  nodes: {
    tree: {"id":"tree","itemId":"driftwood","rechargeSeconds":28800,"yieldQty":4},
    flint_rock: {"id":"flint_rock","itemId":"flint","rechargeSeconds":28800,"yieldQty":2},
    rustite_node: {"id":"rustite_node","itemId":"rustite","rechargeSeconds":28800,"yieldQty":1},
    glintstone_node: {"id":"glintstone_node","itemId":"glintstone","rechargeSeconds":72000,"yieldQty":1},
    dewquartz_node: {"id":"dewquartz_node","itemId":"dewquartz","rechargeSeconds":72000,"yieldQty":1},
    sandglint_node: {"id":"sandglint_node","itemId":"sandglint","rechargeSeconds":72000,"yieldQty":16},
    cinderite_node: {"id":"cinderite_node","itemId":"cinderite","rechargeSeconds":259200,"yieldQty":1},
    bellpear_tree: {"id":"bellpear_tree","itemId":"bellpear","rechargeSeconds":36000,"yieldQty":3},
    mistplum_tree: {"id":"mistplum_tree","itemId":"mistplum","rechargeSeconds":36000,"yieldQty":3},
    honeydate_palm: {"id":"honeydate_palm","itemId":"honeydate","rechargeSeconds":36000,"yieldQty":3},
    firefig_tree: {"id":"firefig_tree","itemId":"firefig","rechargeSeconds":36000,"yieldQty":3},
  },
  cropUnlockBlock: {
    mintleaf: "homestead_01",
    dewcress: "homestead_01",
    pebblepea: "homestead_01",
    curlwort: "homestead_02",
    puffbean: "homestead_03",
    sweetstalk: "homestead_02",
    redroot: "homestead_03",
    bluepod: "breezewood_01",
    frillhead: "breezewood_02",
    honeyleek: "homestead_04",
    sunbulb: "breezewood_03",
    stripemelon: "homestead_05",
    glowgourd: "homestead_06",
    sandspud: "ochremesa_01",
    silkpod: "breezewood_05",
    crownbloom: "breezewood_07",
    duneroot: "ochremesa_02",
    miragemelon: "ochremesa_04",
    starthistle: "ochremesa_06",
    cinderpod: "emberpeak_01",
    ashbloom: "emberpeak_02",
    magmabulb: "emberpeak_03",
    embercrown: "emberpeak_05",
  },
};
