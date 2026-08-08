const assert = require('node:assert/strict');

class FakeEmbedBuilder {
    constructor(seed = {}) {
        this.data = { ...seed };
    }

    static from(embed) {
        return new FakeEmbedBuilder(embed?.data || embed || {});
    }

    setColor(value) {
        this.data.color = value;
        return this;
    }

    setTitle(value) {
        this.data.title = value;
        return this;
    }

    setDescription(value) {
        this.data.description = value;
        return this;
    }

    setFooter(value) {
        this.data.footer = value;
        return this;
    }

    setTimestamp(value = true) {
        this.data.timestamp = value;
        return this;
    }

    setImage(value) {
        this.data.image = value;
        return this;
    }

    addFields(...fields) {
        this.data.fields = [...(this.data.fields || []), ...fields.flat()];
        return this;
    }

    toJSON() {
        return this.data;
    }
}

class FakeButtonBuilder {
    constructor() {
        this.data = {};
    }

    setCustomId(value) {
        this.data.customId = value;
        return this;
    }

    setLabel(value) {
        this.data.label = value;
        return this;
    }

    setStyle(value) {
        this.data.style = value;
        return this;
    }

    setEmoji(value) {
        this.data.emoji = value;
        return this;
    }

    setDisabled(value) {
        this.data.disabled = value;
        return this;
    }
}

class FakeStringSelectMenuBuilder extends FakeButtonBuilder {
    setPlaceholder(value) {
        this.data.placeholder = value;
        return this;
    }

    addOptions(options) {
        this.data.options = options;
        return this;
    }
}

class FakeTextInputBuilder extends FakeButtonBuilder {
    setRequired(value) {
        this.data.required = value;
        return this;
    }

    setPlaceholder(value) {
        this.data.placeholder = value;
        return this;
    }
}

class FakeModalBuilder extends FakeButtonBuilder {
    setTitle(value) {
        this.data.title = value;
        return this;
    }

    addComponents(...components) {
        this.data.components = components;
        return this;
    }
}

class FakeActionRowBuilder {
    constructor() {
        this.components = [];
    }

    addComponents(...components) {
        this.components.push(...components.flat());
        return this;
    }
}

class FakeCursor {
    constructor(rows) {
        this.rows = [...rows];
    }

    sort(sortSpec) {
        const [[field, direction]] = Object.entries(sortSpec);
        this.rows.sort((a, b) => {
            if (a[field] === b[field]) return 0;
            return a[field] > b[field] ? direction : -direction;
        });
        return this;
    }

    limit(count) {
        this.rows = this.rows.slice(0, count);
        return this;
    }

    async toArray() {
        return [...this.rows];
    }
}

class MemoryCollection {
    constructor(rows = []) {
        this.rows = rows.map(row => ({ ...row }));
        this.inserted = [];
        this.updated = [];
    }

    async findOne(query) {
        return this.rows.find(row => matchesQuery(row, query)) || null;
    }

    find(query = {}) {
        return new FakeCursor(this.rows.filter(row => matchesQuery(row, query)));
    }

    async insertOne(document) {
        const insertedId = document._id || `id_${this.rows.length + 1}`;
        const row = { ...document, _id: insertedId };
        this.rows.push(row);
        this.inserted.push(row);
        return { insertedId };
    }

    async updateOne(filter, update, options = {}) {
        let row = this.rows.find(item => matchesQuery(item, filter));
        const matchedCount = row ? 1 : 0;

        if (!row && options.upsert) {
            row = { ...extractEqualityFields(filter) };
            applyUpdate(row, update, true);
            this.rows.push(row);
        } else if (row) {
            applyUpdate(row, update, false);
        }

        this.updated.push({ filter, update, options });
        return { matchedCount, modifiedCount: row ? 1 : 0, upsertedCount: matchedCount ? 0 : Number(Boolean(options.upsert)) };
    }

    async updateMany(filter, update) {
        const rows = this.rows.filter(row => matchesQuery(row, filter));
        for (const row of rows) {
            applyUpdate(row, update, false);
        }
        this.updated.push({ filter, update, many: true });
        return { matchedCount: rows.length, modifiedCount: rows.length };
    }

    async findOneAndUpdate(filter, update, options = {}) {
        let row = this.rows.find(item => matchesQuery(item, filter));
        const before = row ? { ...row } : null;

        if (!row && options.upsert) {
            row = { ...extractEqualityFields(filter) };
            applyUpdate(row, update, true);
            this.rows.push(row);
        } else if (row) {
            applyUpdate(row, update, false);
        }

        if (!row) return null;
        return options.returnDocument === 'after' ? { ...row } : before;
    }
}

function matchesQuery(row, query = {}) {
    return Object.entries(query).every(([field, expected]) => {
        const actual = row[field];

        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
            if ('$gte' in expected && !(actual >= expected.$gte)) return false;
            if ('$gt' in expected && !(actual > expected.$gt)) return false;
            if ('$lt' in expected && !(actual < expected.$lt)) return false;
            if ('$lte' in expected && !(actual <= expected.$lte)) return false;
            if ('$in' in expected && !expected.$in.includes(actual)) return false;
            return true;
        }

        return actual === expected;
    });
}

function extractEqualityFields(filter) {
    return Object.fromEntries(
        Object.entries(filter).filter(([, value]) => !(value && typeof value === 'object' && !Array.isArray(value)))
    );
}

function applyUpdate(row, update, inserting) {
    if (update.$set) Object.assign(row, update.$set);
    if (inserting && update.$setOnInsert) Object.assign(row, update.$setOnInsert);
    if (update.$inc) {
        for (const [field, amount] of Object.entries(update.$inc)) {
            row[field] = (row[field] || 0) + amount;
        }
    }
    if (update.$push) {
        for (const [field, value] of Object.entries(update.$push)) {
            row[field] = [...(row[field] || []), value];
        }
    }
    if (update.$unset) {
        for (const field of Object.keys(update.$unset)) {
            delete row[field];
        }
    }
}

function createBaseCtx(overrides = {}) {
    return {
        EmbedBuilder: FakeEmbedBuilder,
        ButtonBuilder: FakeButtonBuilder,
        StringSelectMenuBuilder: FakeStringSelectMenuBuilder,
        ActionRowBuilder: FakeActionRowBuilder,
        ModalBuilder: FakeModalBuilder,
        TextInputBuilder: FakeTextInputBuilder,
        TextInputStyle: { Short: 'short', Paragraph: 'paragraph' },
        ButtonStyle: { Primary: 1, Secondary: 2, Success: 3, Danger: 4 },
        MessageFlags: { Ephemeral: 64 },
        HOFFMAN_RED: 0x8B0000,
        REVIEW_ROLE_IDS: ['rank9', 'rank10'],
        FAMILY_ROLE_IDS: ['family', 'rank9', 'rank10'],
        RANK_10_ROLE_ID: 'rank10',
        GUEST_ROLE_ID: 'guest',
        BANK_CHANNEL_ID: 'bank-channel',
        QUEST_CHANNEL_ID: 'quest-channel',
        balances: undefined,
        dailyStats: undefined,
        botSettings: undefined,
        questDefinitions: undefined,
        questStates: undefined,
        birthdays: undefined,
        lotteryTickets: undefined,
        lotterySettings: undefined,
        lotteryHistory: undefined,
        dailyTasksPool: undefined,
        dailyTaskSubmissions: undefined,
        dailyTaskSettings: undefined,
        bankOperations: undefined,
        personnelActions: undefined,
        careerApplications: undefined,
        commandCooldowns: new Map(),
        questProcessingLocks: new Set(),
        ...overrides
    };
}

function createMember(roleIds = []) {
    return {
        displayName: 'Test Member',
        roles: {
            cache: {
                has: roleId => roleIds.includes(roleId)
            }
        }
    };
}

function assertDescriptionIncludes(embed, text) {
    assert.match(embed.data.description, new RegExp(escapeRegExp(text)));
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    FakeEmbedBuilder,
    MemoryCollection,
    assertDescriptionIncludes,
    createBaseCtx,
    createMember
};
