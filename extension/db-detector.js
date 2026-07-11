// Lucky Patcher – Database & Stack Fingerprinter
// Detects database type, ORM, framework, and cloud provider from
// response headers, URL patterns, body content, and error messages.

export function detectStack(entry) {
  const result = {
    databases: [],
    orm: null,
    framework: null,
    cloud: null,
    apiStyle: null,
    confidence: "low",
    evidence: [],
  };

  const url = (entry.url || "").toLowerCase();
  const domain = (entry.domain || "").toLowerCase();
  const headers = { ...(entry.responseHeaders || {}), ...(entry.requestHeaders || {}) };
  const body = (entry.responseBody || "").toLowerCase();
  const status = entry.statusCode;

  // ── URL / Domain fingerprinting ──────────────────────────────────────────
  const urlChecks = [
    // Cloud DBaaS
    { pattern: /firebaseio\.com|firestore\.googleapis\.com|firebase\.google\.com/, db: "Firebase / Firestore", cloud: "Google Cloud", confidence: "high" },
    { pattern: /\.supabase\.co|supabase\.in/, db: "PostgreSQL", cloud: "Supabase", confidence: "high" },
    { pattern: /\.neon\.tech/, db: "PostgreSQL", cloud: "Neon", confidence: "high" },
    { pattern: /psdb\.cloud|planetscale\.com/, db: "MySQL (PlanetScale)", cloud: "PlanetScale", confidence: "high" },
    { pattern: /cockroachlabs\.cloud|cockroachdb\.com/, db: "CockroachDB (PostgreSQL-compat)", cloud: "CockroachDB", confidence: "high" },
    { pattern: /upstash\.io/, db: "Redis", cloud: "Upstash", confidence: "high" },
    { pattern: /redislabs\.com/, db: "Redis", cloud: "Redis Cloud", confidence: "high" },
    { pattern: /astra\.datastax\.com/, db: "Cassandra", cloud: "DataStax Astra", confidence: "high" },
    { pattern: /dynamodb\.|\.amazonaws\.com.*dynamodb/, db: "DynamoDB", cloud: "AWS", confidence: "high" },
    { pattern: /rds\.amazonaws\.com/, db: "MySQL / PostgreSQL / SQL Server (RDS)", cloud: "AWS RDS", confidence: "high" },
    { pattern: /mongo\.net|mongodb\.net|atlas\.mongodb\.com/, db: "MongoDB Atlas", cloud: "MongoDB Atlas", confidence: "high" },
    { pattern: /elastic\.co|\.es\.io|elasticsearch/, db: "Elasticsearch", cloud: "Elastic Cloud", confidence: "high" },
    { pattern: /influxdata\.com|influxdb/, db: "InfluxDB", confidence: "high" },
    { pattern: /tidbcloud\.com/, db: "TiDB (MySQL-compat)", cloud: "TiDB Cloud", confidence: "high" },
    { pattern: /turso\.io|\.turso\.tech/, db: "SQLite (libSQL/Turso)", cloud: "Turso", confidence: "high" },
    { pattern: /xata\.io/, db: "PostgreSQL", cloud: "Xata", confidence: "high" },
    { pattern: /convex\.cloud/, db: "Convex (document DB)", cloud: "Convex", confidence: "high" },
    { pattern: /appwrite\.io/, db: "Appwrite (document DB)", cloud: "Appwrite", confidence: "high" },
    { pattern: /pocketbase\.io/, db: "SQLite (PocketBase)", confidence: "high" },
    { pattern: /hasura\.app|hasura\.io/, db: "PostgreSQL (via Hasura)", confidence: "high" },
    { pattern: /fauna\.com|db\.fauna\.com/, db: "FaunaDB", cloud: "Fauna", confidence: "high" },
    { pattern: /dgraph\.io/, db: "Dgraph (GraphDB)", confidence: "high" },

    // API style hints from URL path
    { pattern: /\/graphql($|\/)/, apiStyle: "GraphQL" },
    { pattern: /\/_api\/|\/api\/odata/, apiStyle: "OData (likely MSSQL/Azure)" },
    { pattern: /\/rest\/v\d|\/api\/v\d/, apiStyle: "REST" },
    { pattern: /\/trpc\//, apiStyle: "tRPC" },
    { pattern: /\/jsonrpc/, apiStyle: "JSON-RPC" },
  ];

  for (const check of urlChecks) {
    if (check.pattern.test(url) || check.pattern.test(domain)) {
      if (check.db && !result.databases.includes(check.db)) result.databases.push(check.db);
      if (check.cloud) result.cloud = check.cloud;
      if (check.apiStyle) result.apiStyle = check.apiStyle;
      if (check.confidence === "high") result.confidence = "high";
      result.evidence.push(`URL match: ${check.pattern.source.slice(0, 60)}`);
    }
  }

  // ── Response header fingerprinting ───────────────────────────────────────
  const h = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), (v || "").toLowerCase()])
  );

  const headerChecks = [
    // Framework / Server
    { header: "x-powered-by", pattern: /php/, framework: "PHP", db: "MySQL / MariaDB / PostgreSQL" },
    { header: "x-powered-by", pattern: /asp\.net/, framework: "ASP.NET", db: "SQL Server / Azure SQL" },
    { header: "x-powered-by", pattern: /express/, framework: "Express.js (Node)" },
    { header: "x-powered-by", pattern: /next\.js/, framework: "Next.js" },
    { header: "x-powered-by", pattern: /laravel/, framework: "Laravel (PHP)", db: "MySQL" },
    { header: "x-powered-by", pattern: /rails|rack/, framework: "Ruby on Rails", db: "PostgreSQL / MySQL" },
    { header: "x-powered-by", pattern: /django|python/, framework: "Django (Python)", db: "PostgreSQL / MySQL / SQLite" },
    { header: "x-powered-by", pattern: /spring|java/, framework: "Spring (Java)", db: "MySQL / PostgreSQL / Oracle" },

    { header: "server", pattern: /nginx/, framework: "Nginx" },
    { header: "server", pattern: /apache/, framework: "Apache" },
    { header: "server", pattern: /iis/, framework: "IIS (Microsoft)", db: "SQL Server" },
    { header: "server", pattern: /cloudflare/, cloud: "Cloudflare" },
    { header: "server", pattern: /vercel/, cloud: "Vercel" },
    { header: "server", pattern: /heroku/, cloud: "Heroku" },
    { header: "server", pattern: /oracle/, db: "Oracle DB", framework: "Oracle Application Server" },

    // DB-specific headers
    { header: "x-db-host", present: true, evidence: "x-db-host header exposed" },
    { header: "x-database", present: true, evidence: "x-database header exposed" },
    { header: "x-mongo-objectid", present: true, db: "MongoDB" },
    { header: "x-cassandra-cluster", present: true, db: "Cassandra" },
    { header: "x-hasura-role", present: true, db: "PostgreSQL (via Hasura)" },

    // Cloud signals
    { header: "x-amzn-requestid", present: true, cloud: "AWS" },
    { header: "x-amzn-trace-id", present: true, cloud: "AWS" },
    { header: "x-ms-request-id", present: true, cloud: "Azure" },
    { header: "x-ms-correlation-request-id", present: true, cloud: "Azure" },
    { header: "x-goog-request-id", present: true, cloud: "Google Cloud" },
    { header: "x-firebase-appcheck", present: true, db: "Firebase / Firestore", cloud: "Google Cloud" },
    { header: "x-vercel-id", present: true, cloud: "Vercel" },
    { header: "x-netlify", present: true, cloud: "Netlify" },
    { header: "fly-request-id", present: true, cloud: "Fly.io" },
    { header: "render-request-id", present: true, cloud: "Render" },
    { header: "x-railway-request-id", present: true, cloud: "Railway" },
    { header: "cf-ray", present: true, cloud: "Cloudflare" },

    // API style
    { header: "content-type", pattern: /application\/graphql/, apiStyle: "GraphQL" },
    { header: "content-type", pattern: /application\/xml|text\/xml/, apiStyle: "SOAP / XML API" },
  ];

  for (const check of headerChecks) {
    const val = h[check.header];
    if (val === undefined) continue;

    const matched =
      (check.present && val !== undefined) ||
      (check.pattern && check.pattern.test(val));

    if (matched) {
      if (check.db && !result.databases.includes(check.db)) result.databases.push(check.db);
      if (check.framework) result.framework = check.framework;
      if (check.cloud) result.cloud = check.cloud;
      if (check.apiStyle) result.apiStyle = check.apiStyle;
      if (result.confidence === "low") result.confidence = "medium";
      const ev = check.evidence || `${check.header}: ${val.slice(0, 60)}`;
      result.evidence.push(ev);
    }
  }

  // ── Response body / error fingerprinting ────────────────────────────────
  if (body) {
    const bodyChecks = [
      // PostgreSQL
      { pattern: /pgsql|psql|postgresql|psqlexception|duplicate key value violates unique constraint|sqlstate\[|pg_exception/, db: "PostgreSQL" },
      // MySQL / MariaDB
      { pattern: /you have an error in your sql syntax|duplicate entry .+ for key|mysql_|mariadb|com\.mysql\.jdbc/, db: "MySQL / MariaDB" },
      // SQLite
      { pattern: /sqlite_error|sqlite_constraint|no such table|sqlite3|pysqlite|android\.database\.sqlite/, db: "SQLite" },
      // Oracle
      { pattern: /\bora-\d{5}\b|plsql|oracle\.jdbc|sqlplus/, db: "Oracle DB" },
      // MSSQL / Azure SQL
      { pattern: /invalid column name|incorrect syntax near|sqlexception|microsoft\.data\.sqlclient|system\.data\.sqlclient|mssql/, db: "SQL Server" },
      // MongoDB
      { pattern: /mongoerror|mongoclient|e11000 duplicate key error|cast to objectid failed|bson\.objectid|mongodb:\/\/|\$oid/, db: "MongoDB" },
      // Redis
      { pattern: /redis_error|rediserror|ioredis|jedis|stackexchange\.redis/, db: "Redis" },
      // Elasticsearch
      { pattern: /elasticsearch|index_not_found_exception|org\.elasticsearch|opensearch/, db: "Elasticsearch / OpenSearch" },
      // DynamoDB
      { pattern: /dynamodb|conditioncheckfailedexception|provisionedthroughputexceededexception|resourcenotfoundexception.*dynamo/, db: "DynamoDB" },
      // Cassandra
      { pattern: /cassandraexception|com\.datastax\.|nosuchelementexception.*cassandra/, db: "Cassandra" },
      // Firebase / Firestore
      { pattern: /firestore|firebase.*database|projects\/.*\/databases|cloud\.google\.com\/firestore/, db: "Firebase / Firestore" },
      // CockroachDB
      { pattern: /cockroachdb|crdb_internal/, db: "CockroachDB" },
      // FaunaDB
      { pattern: /faunadb|com\.fauna/, db: "FaunaDB" },
      // Prisma
      { pattern: /prismaclientknownrequesterror|prismacliente|@prisma\/client/, orm: "Prisma" },
      // SQLAlchemy
      { pattern: /sqlalchemy\.exc|sqlalchemy\.orm/, orm: "SQLAlchemy (Python)" },
      // Hibernate / JPA
      { pattern: /org\.hibernate|javax\.persistence|jakarta\.persistence/, orm: "Hibernate / JPA (Java)" },
      // Django ORM
      { pattern: /django\.db|django\.core\.exceptions|models\.py/, orm: "Django ORM", framework: "Django" },
      // ActiveRecord (Rails)
      { pattern: /activerecord::|activesupport::|rails/, orm: "ActiveRecord", framework: "Rails" },
      // Laravel / Eloquent
      { pattern: /illuminate\\database|eloquent|laravel/, orm: "Eloquent (Laravel)", framework: "Laravel" },
      // TypeORM
      { pattern: /typeorm|queryrunner/, orm: "TypeORM" },
      // Drizzle
      { pattern: /drizzle-orm/, orm: "Drizzle ORM" },
      // Mongoose
      { pattern: /mongoose|validatorerror|casttoobjectid/, orm: "Mongoose (MongoDB)" },
      // Sequelize
      { pattern: /sequelize|sequelizeuniqueconstrainterror/, orm: "Sequelize" },
      // GraphQL error structure
      { pattern: /"errors"\s*:\s*\[.*"message"/, apiStyle: "GraphQL" },
      // Stack traces leaking tech
      { pattern: /at Object\.<anonymous>|node_modules\//, framework: "Node.js" },
      { pattern: /at org\.springframework|at java\./, framework: "Spring (Java)" },
      { pattern: /traceback \(most recent call last\)|file ".*\.py"/, framework: "Python" },
      { pattern: /in vendor\/bundle|\.rb:\d+:in/, framework: "Ruby" },
    ];

    for (const check of bodyChecks) {
      if (check.pattern.test(body)) {
        if (check.db && !result.databases.includes(check.db)) result.databases.push(check.db);
        if (check.orm) result.orm = check.orm;
        if (check.framework) result.framework = check.framework;
        if (check.apiStyle) result.apiStyle = check.apiStyle;
        if (result.confidence === "low") result.confidence = "medium";
        result.evidence.push(`Body match: ${check.pattern.source.slice(0, 60)}`);
      }
    }

    // Detect exposed DB connection strings
    const connStringPatterns = [
      { re: /postgresql:\/\/[^\s"'<>]+|postgres:\/\/[^\s"'<>]+/, db: "PostgreSQL", severity: "CRITICAL — connection string exposed" },
      { re: /mysql:\/\/[^\s"'<>]+/, db: "MySQL", severity: "CRITICAL — connection string exposed" },
      { re: /mongodb(\+srv)?:\/\/[^\s"'<>]+/, db: "MongoDB", severity: "CRITICAL — connection string exposed" },
      { re: /redis:\/\/[^\s"'<>]+/, db: "Redis", severity: "CRITICAL — connection string exposed" },
      { re: /sqlserver:\/\/[^\s"'<>]+|mssql:\/\/[^\s"'<>]+/, db: "SQL Server", severity: "CRITICAL — connection string exposed" },
      { re: /amqp:\/\/[^\s"'<>]+/, db: "RabbitMQ / AMQP", severity: "CRITICAL — broker URI exposed" },
    ];

    for (const cp of connStringPatterns) {
      if (cp.re.test(body)) {
        if (!result.databases.includes(cp.db)) result.databases.push(cp.db);
        result.confidence = "high";
        result.evidence.push(`⚠ ${cp.severity}`);
      }
    }
  }

  // ── Finalize ─────────────────────────────────────────────────────────────
  if (result.databases.length > 0 || result.framework || result.cloud) {
    if (result.confidence === "low") result.confidence = "medium";
  }

  if (
    result.databases.length === 0 &&
    !result.framework &&
    !result.cloud &&
    !result.apiStyle
  ) {
    return null; // nothing detected — don't pollute captures
  }

  return result;
}

// Summarise detected stack as a short label
export function stackLabel(stack) {
  if (!stack) return null;
  const parts = [];
  if (stack.databases.length) parts.push(stack.databases[0]);
  if (stack.orm) parts.push(stack.orm);
  if (stack.framework) parts.push(stack.framework);
  if (stack.cloud) parts.push(stack.cloud);
  return parts.join(" · ") || null;
}
