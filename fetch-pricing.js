// fetchPricing.js
const fs = require('fs');
const https = require('https');
const path = require('path');

const services = [
  "Virtual Machines",
  "Storage",
  "Load Balancer",
  "Virtual Network",
  "Azure Firewall",
  "Disks",
  "VM Scale Sets"
];

const regions = ["eastus", "centralindia", "westus"];
const outputDir = path.join(__dirname, 'static');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

function fetchAllPages(url) {
  return new Promise((resolve, reject) => {
    let results = [];

    function fetchNext(nextUrl) {
      https.get(nextUrl, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            results = results.concat(json.Items);
            if (json.NextPageLink) {
              fetchNext(json.NextPageLink);
            } else {
              resolve(results);
            }
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    }

    fetchNext(url);
  });
}

(async () => {
  for (const service of services) {
    for (const region of regions) {
      const encodedService = encodeURIComponent(service);
      const url = `https://prices.azure.com/api/retail/prices?$filter=serviceName eq '${encodedService}' and armRegionName eq '${region}'`;
      const fileName = `${service.toLowerCase().replace(/\\s+/g, '-')}-${region}.json`;
      const filePath = path.join(outputDir, fileName);

      try {
        console.log(`Fetching: ${service} (${region})`);
        const items = await fetchAllPages(url);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        console.log(`✅ Saved ${items.length} items to ${fileName}`);
      } catch (err) {
        console.error(`❌ Failed to fetch ${service} (${region}): ${err.message}`);
      }
    }
  }

  console.log('\\n🎉 All pricing files downloaded to /static folder!');
})();
