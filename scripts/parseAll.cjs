const fs = require('fs');
const path = require('path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function extractBetween(html, start, end) {
  const lo = html.toLowerCase();
  const startLo = start.toLowerCase();
  const endLo = end.toLowerCase();
  const startIdx = lo.indexOf(startLo);
  if (startIdx === -1) return "";
  const after = html.slice(startIdx + start.length);
  const afterLo = after.toLowerCase();
  const endIdx = afterLo.indexOf(endLo);
  if (endIdx === -1) return after.trim();
  return after.slice(0, endIdx).trim();
}

function extractComment(html, prefix, suffix) {
  try {
    const regex = new RegExp(`<!${prefix}([\\s\\S]*?)${suffix}>`, "i");
    const m = html.match(regex);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

function parseTdRow(row) {
  return (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => stripTags(c).trim());
}

// ─── Section parsers ──────────────────────────────────────────────────────────

function parseMachineName(html, fileName) {
  const m = html.match(/<!WKS([\s\S]*?)Fim_WKS>/i);
  if (m && m[1].trim()) return m[1].trim();

  const h1 = html.match(/<H1[^>]*><b>([\s\S]*?)<\/b>/i);
  if (h1) {
    const raw = stripTags(h1[1]);
    const nameMatch = raw.match(/:\s*(.+)/);
    if (nameMatch) return nameMatch[1].trim();
    return raw.trim();
  }

  const h1s = [...html.matchAll(/<H1[^>]*>([\s\S]*?)<\/H1>/gi)];
  if (h1s.length >= 2) {
    const name = stripTags(h1s[1][1]).trim();
    if (name) return name;
  }

  return fileName.replace(/\.html?$/i, "");
}

function parseOS(html) {
  const osName = extractComment(html, "SO", "Fim_SO");
  const section = extractBetween(html, "name='#SO'", "name='#proc'");
  const text = stripTags(section);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const getVal = (key) => {
    const line = lines.find(l => l.toLowerCase().includes(key.toLowerCase()));
    if (!line) return "";
    const parts = line.split(":");
    return parts.slice(1).join(":").replace(/\.+$/, "").trim();
  };

  return {
    osName: osName || lines.find(l => l.toLowerCase().includes("windows") || l.toLowerCase().includes("linux")) || lines[0] || "",
    osVersion: getVal("vers") || getVal("version") || "",
    servicePack: getVal("service pack") || "",
    bootDevice: getVal("boot") || "",
    installDir: getVal("diret") || getVal("install") || "",
    registeredUser: getVal("usu") || getVal("user") || "",
    serialNumber: getVal("serial") || "",
    timeZone: getVal("time zone") || getVal("fuso") || getVal("hora") || "",
  };
}

// Processor
function parseProcessor(html) {
  const procNameComment = html.match(/<!Processador>([\s\S]*?)<!Fim_Proc>/i);
  const procName = procNameComment ? procNameComment[1].trim() : "";

  const section = extractBetween(html, "name='#proc'", "name='#bios'");
  const text = stripTags(section);
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);

  const familyLine = lines.find(l => /intel64|amd64|x86/i.test(l)) || lines[0] || "";
  const speedLine = lines.find(l => /\d+\s*mhz/i.test(l)) || "";
  const nameLine = procName || lines.find(l => /core|ryzen|xeon|celeron|pentium|atom/i.test(l)) || lines[1] || "";

  return {
    processorFamily: familyLine,
    processorName: nameLine,
    processorSpeed: speedLine,
  };
}

// BIOS
function parseBios(html) {
  const manuMatch = html.match(/Fabricante\s*:\s*([^\n<]+)/i);
  const tagMatch = html.match(/Serie\/Service Tag\s*:\s*([^\n<]+)/i) || html.match(/Service Tag\s*:\s*([^\n<]+)/i);
  const modelRaw = html.match(/Modelo Equipamento\s*:\s*([\s\S]*?)(?:<\/pre>|<li>|<\/ul>)/i);
  const biosVerMatch = html.match(/BIOS Version\s*:\s*([^\n<]+)/i);
  const biosDateMatch = html.match(/Release Date\s*:\s*([^\n<]+)/i);

  const manuComment = extractComment(html, "Fabricante>\\s*[\\s\\S]*?Fabricante\\s*:\\s*", "Fim_Fabricante");
  const serieComment = extractComment(html, "Serie>\\s*[\\s\\S]*?:\\s*", "Fim_Serie");
  const modelComment = extractComment(html, "Modelo>\\s*[\\s\\S]*?:\\s*", "Fim_Modelo");

  const manufacturer = manuMatch ? manuMatch[1].trim() : manuComment;
  const serviceTag = tagMatch ? tagMatch[1].trim() : serieComment;
  const model = modelRaw ? stripTags(modelRaw[1]).trim() : (modelComment || "");
  const biosVersion = biosVerMatch ? biosVerMatch[1].trim() : "";
  const biosDate = biosDateMatch ? biosDateMatch[1].trim() : "";

  return { manufacturer, serviceTag, model, biosVersion, biosDate };
}

// Memory
function parseMemory(html) {
  const slots = [];
  let totalMB = 0;

  const memComments = [...html.matchAll(/<!Memoria(\d+)Fim_Mem>/gi)];
  if (memComments.length > 0) {
    totalMB = memComments.reduce((acc, m) => acc + parseInt(m[1], 10), 0);
  }

  const memSection = extractBetween(html, "emória", "rquivo de Pagina");
  if (memSection) {
    const parts = memSection.split(/Physical Memory/i).slice(1);
    parts.forEach((part, i) => {
      const lines = part.split("\n").map(l => stripTags(l).trim()).filter(l => l.length > 0);
      const isEmpty = part.toLowerCase().includes("vazio") || part.toLowerCase().includes("empty");
      if (isEmpty) {
        slots.push({ slot: `Slot ${i}`, sizeMB: "0", type: "", status: "Vazio" });
      } else {
        const numLine = lines.find(l => /^\d+$/.test(l));
        const sizeMB = numLine || "0";
        const sz = parseInt(sizeMB, 10);
        if (!isNaN(sz) && sz > 0 && totalMB === 0) totalMB += sz;
        slots.push({ slot: `Slot ${i}`, sizeMB, type: lines[2] || "", status: "Ativa" });
      }
    });
  }

  if (totalMB === 0) {
    const fallback = memComments.reduce((acc, m) => acc + parseInt(m[1], 10), 0);
    if (fallback > 0) totalMB = fallback;
  }

  const pageFileMatch = html.match(/pagefile\.sys<\/td>.*?<td[^>]*><center>(\d+MB)/i);

  return {
    slots,
    totalMB,
    pageFile: "C:\\pagefile.sys",
    pageFileSize: pageFileMatch ? pageFileMatch[1] : "",
  };
}

// Network
function parseNetwork(html) {
  const adapters = [];
  const section = extractBetween(html, "name='#rede'", "name='#tcp'");
  if (!section) return adapters;

  const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  rows.slice(1).forEach(row => {
    const cells = parseTdRow(row);
    if (cells.length >= 5 && cells[1]) {
      adapters.push({
        type: cells[0],
        description: cells[1],
        mac: cells[2],
        manufacturer: cells[3],
        status: cells[4],
        connectionName: cells[5] || "",
        speed: cells[6] || "",
      });
    }
  });
  return adapters;
}

// TCP
function parseTCP(html) {
  const configs = [];
  const primaryIPMatch = html.match(/<!IP1([\d.]+)Fim_IP1>/i);
  const primaryIP = primaryIPMatch ? primaryIPMatch[1] : "";

  const tcpSection = extractBetween(html, "name='#tcp'", "name='#discos'");
  if (!tcpSection) return { configs, primaryIP };

  const blocks = tcpSection.split(/<table[^>]*bgcolor[^>]*>/i).slice(1);

  blocks.forEach(block => {
    const nameMatch = block.match(/<!Nome_Pl([\s\S]*?)Fim_Pl>/i);
    const ipTypeMatch = block.match(/IP (Est[aá]tico|Din[aâ]mico)/i);
    const ipComment = block.match(/<!IP1([\s\S]*?)Fim_IP1>/i);

    const ipMatch = block.match(/IP<\/td><td[^>]*>([\d.:a-fA-F]+)/i);
    const maskMatch = block.match(/Mascara<\/td><td[^>]*>([\d.]+)/i);
    const gwMatch = block.match(/Gateway<\/td><td[^>]*>([\d.:]+)/i);
    const dnsBlock = block.match(/DNS<\/td><td[^>]*>([\s\S]*?)(?:<\/td>|<tr>)/i);
    const dnsText = dnsBlock ? stripTags(dnsBlock[1]).trim() : "";

    configs.push({
      adapterName: nameMatch ? stripTags(nameMatch[1]).trim() : "",
      ipType: ipTypeMatch ? ipTypeMatch[1] : "",
      ip: ipComment ? ipComment[1].trim() : (ipMatch ? ipMatch[1].trim() : ""),
      mask: maskMatch ? maskMatch[1].trim() : "",
      gateway: gwMatch ? gwMatch[1].trim() : "",
      dns: dnsText ? dnsText.split(/\s+/).filter(d => /[\d.]/.test(d)) : [],
    });
  });

  const resolvedIP = primaryIP || configs.find(c => c.ip && c.ip !== "0.0.0.0")?.ip || "";
  return { configs, primaryIP: resolvedIP };
}

// Disks
function parseDisks(html) {
  const details = [];
  const partitions = [];

  const diskSection = extractBetween(html, "etalhe dos Discos", "arti");
  if (diskSection) {
    const blocks = diskSection.split(/<ul>/i).filter(b => b.includes("Caption") || b.includes("PHYSICALDRIVE"));
    blocks.forEach(block => {
      const getField = (key) => {
        const m = block.match(new RegExp(`<b>${key}[^<]*<\/b>\\s*([^<\n]+)`, "i"));
        return m ? m[1].trim() : "";
      };
      const caption = getField("Caption");
      const deviceId = getField("Device ID");
      if (caption || deviceId) {
        const sizeComment = block.match(/<!Disco\d+(\d+)Fim_Disco\d+>/i);
        const sizeField = getField("Size").replace(/MB/i, "").trim();
        details.push({
          caption,
          deviceId,
          interfaceType: getField("Interface Type"),
          model: getField("Model"),
          partitions: getField("Partitions"),
          sizeMB: sizeComment ? sizeComment[1] : sizeField,
          status: getField("Status"),
        });
      }
    });
  }

  const disk1 = html.match(/<!Disco1(\d+)Fim_Disco1>/i);
  const disk2 = html.match(/<!Disco2(\d+)Fim_Disco2>/i);
  if (disk1 && details[0] && !details[0].sizeMB) details[0].sizeMB = disk1[1];
  if (disk2 && details[1] && !details[1].sizeMB) details[1].sizeMB = disk2[1];

  const partSection = extractBetween(html, "arti", "nidade de CDROM");
  if (partSection) {
    const rows = partSection.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    rows.slice(1).forEach(row => {
      const cells = parseTdRow(row);
      if (cells.length >= 3 && cells[0] && cells[0].match(/^[A-Z]:/i)) {
        partitions.push({
          drive: cells[0],
          sizeMB: cells[1].replace(/\D/g, ""),
          type: cells[2],
          freeSpaceMB: cells[3]?.replace(/\D/g, "") || "",
        });
      }
    });
  }

  return { details, partitions };
}

// Users
function parseUsers(html) {
  const users = [];
  const section = extractBetween(html, "name='#usuarios'", "name='#software'");
  if (!section) return users;

  const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  rows.slice(1).forEach(row => {
    const cells = parseTdRow(row);
    if (cells.length >= 4 && cells[0]) {
      users.push({
        login: cells[0],
        fullName: cells[1] || "-",
        description: cells[2] || "",
        status: cells[3] || "",
        groups: cells[4] || "",
      });
    }
  });
  return users;
}

// Software
function parseSoftware(html) {
  const section = extractBetween(html, "name='#software'", "name='#servicos'");
  if (!section) return [];
  return section
    .split(/<br\s*\/?>/gi)
    .map(s => stripTags(s).trim())
    .filter(s => s.length > 2 && !s.startsWith("<") && !s.toLowerCase().includes("software"));
}

// Services
function parseServices(html) {
  const services = [];
  const section = extractBetween(html, "name='#servicos'", "name='#compartilhamentos'");
  if (!section) return services;

  const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  rows.slice(1).forEach(row => {
    const cells = parseTdRow(row);
    if (cells.length >= 3 && cells[0]) {
      services.push({
        name: cells[0],
        startup: cells[1] || "",
        status: cells[2] || "",
        user: cells[3] || "",
      });
    }
  });
  return services;
}

// Shares
function parseShares(html) {
  const shares = [];
  const section = extractBetween(html, "name='#compartilhamentos'", "name='#impressora'");
  if (!section) return shares;

  const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  rows.slice(1).forEach(row => {
    const cells = parseTdRow(row);
    if (cells.length >= 2 && cells[0]) {
      shares.push({ name: cells[0], path: cells[1] });
    }
  });
  return shares;
}

// Printers
function parsePrinters(html) {
  const driverSection = extractBetween(html, "name='#impressora'", "name='#portas'");
  const drivers = (driverSection.match(/<td[^>]*><i>([\s\S]*?)<\/i><\/td>/gi) || [])
    .map(d => stripTags(d).trim())
    .filter(Boolean);

  const portSection = extractBetween(html, "name='#portas'", "name='#event'");
  const portRows = portSection.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const ports = portRows.slice(1).map(row => {
    const cells = parseTdRow(row);
    return { type: cells[0] || "", host: cells[1] || "", port: cells[2] || "", protocol: cells[3] || "" };
  }).filter(p => p.host);

  return { drivers, ports };
}

function parseInventoryHTML(html, fileName, index) {
  const machineName = parseMachineName(html, fileName);
  const os = parseOS(html);
  const proc = parseProcessor(html);
  const bios = parseBios(html);
  const mem = parseMemory(html);
  const network = parseNetwork(html);
  const tcp = parseTCP(html);
  const disks = parseDisks(html);
  const users = parseUsers(html);
  const software = parseSoftware(html);
  const services = parseServices(html);
  const shares = parseShares(html);
  const printers = parsePrinters(html);

  return {
    id: `desktop-machine-${index}-${machineName}`,
    machineName,
    uploadDate: new Date().toISOString(),
    fileName,
    ...os,
    ...proc,
    ...bios,
    memorySlots: mem.slots,
    totalMemoryMB: mem.totalMB,
    pageFileLocation: mem.pageFile,
    pageFileSizeMB: mem.pageFileSize,
    networkAdapters: network,
    tcpConfigs: tcp.configs,
    primaryIP: tcp.primaryIP,
    diskDetails: disks.details,
    partitions: disks.partitions,
    localUsers: users,
    softwareList: software,
    services,
    shares,
    printerDrivers: printers.drivers,
    printerPorts: printers.ports,
  };
}

// ─── Main Script Execution ───────────────────────────────────────────────────

const desktopFolder = "C:\\Users\\INICIO\\Desktop\\MÁQUINAS_HTML";
const targetFile = "C:\\IP_Inventario\\src\\data\\maquinas_iniciais.json";

console.log("Iniciando varredura da pasta:", desktopFolder);

if (!fs.existsSync(desktopFolder)) {
  console.error("Erro: A pasta do Desktop não foi encontrada!");
  process.exit(1);
}

const files = fs.readdirSync(desktopFolder);
const htmlFiles = files.filter(f => f.toLowerCase().endsWith('.html'));

console.log(`Encontrados ${htmlFiles.length} arquivos HTML.`);

const results = [];
let count = 0;

htmlFiles.forEach((file, index) => {
  try {
    const filePath = path.join(desktopFolder, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.length > 100) {
      const parsed = parseInventoryHTML(content, file, index);
      results.push(parsed);
      count++;
    }
  } catch (err) {
    console.error(`Erro ao processar ${file}:`, err.message);
  }
});

console.log(`Processamento concluído. ${count} máquinas extraídas com sucesso.`);

// Gravar JSON
const dataDir = path.dirname(targetFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(targetFile, JSON.stringify(results, null, 2), 'utf-8');
console.log(`Arquivo JSON gerado com sucesso em: ${targetFile}`);
