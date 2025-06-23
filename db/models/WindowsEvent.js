const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WindowsEvent = sequelize.define('WindowsEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    eventId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false
    },
    sourceIP: {
        type: DataTypes.STRING,
        allowNull: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true
    },
    workstation: {
        type: DataTypes.STRING,
        allowNull: true
    },
    logonType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    failureReason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rawData: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'windows_events',
    timestamps: true,
    indexes: [
        { fields: ['eventId'] },
        { fields: ['sourceIP'] },
        { fields: ['timestamp'] },
        { fields: ['processed'] }
    ]
});

module.exports = WindowsEvent;