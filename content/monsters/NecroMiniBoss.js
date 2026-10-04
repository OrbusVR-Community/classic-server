/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var NecroMiniBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroMiniBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroMiniBoss
});

NecroMiniBoss.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.timeAlive = 0;
    this.timeSinceClear = 1;
    this.clearEvery = 0.5;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.monster.isDead) return;
        othis.timeAlive += args.delta;
        if(othis.timeAlive > 20) {
            var nearbyMonster = othis.monster.nearbyMonsters(80, 15, true);
            _.each(nearbyMonster, function(aMonster) {
                if(aMonster.isPlayer && !aMonster.isDead) {
                    if(othis.gameObject.zone.zoneInfo.raidLevel === "expert") {
                        aMonster.gameObject.triggerEvent("TakeDamage", {dmgAmount: 1000000, sender: null, dmgType: "magical", ignoreAggro: true, unstoppable: true});
                    }
                    else {
                        aMonster.gameObject.triggerEvent("TakeDamage", {dmgAmount: 1000000, sender: null, dmgType: "magical", ignoreAggro: true});
                    }
                }
            });
            othis.monster.suicide();
        }
        othis.timeSinceClear += args.delta;
        if(othis.timeSinceClear > othis.clearEvery) {
            othis.timeSinceClear = 0;
            var nearbyMonster = othis.monster.nearbyMonsters(60, 15, true);
            _.each(nearbyMonster, function(aMonster) {
                if(aMonster.isPlayer && !aMonster.isDead) {
                    aMonster.removeStatusEffectByType(62, 1000);
                }
            });
        }
    });

    this.gameObject.addEventListener("MonsterDeath", function(args) {
        if(args.type != "death") return;
        var nearbyMonster = othis.monster.nearbyMonsters(80, 15, true);
        _.each(nearbyMonster, function(aMonster) {
            if(aMonster.isPlayer && !aMonster.isDead) {
                aMonster.addStatusEffect(StatusEffects.Effects.BarbarianBulwark, 2, {});
                aMonster.pcc.movePosition(new Vector3(780.24, 12.8, 719.69), null, true);
            }
        });
    });
}


module.exports = NecroMiniBoss;
