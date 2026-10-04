/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var NecroMini = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroMini.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroMini
});

NecroMini.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.basicAttackPotency = 150;
    this.monster.giveUpChaseAfter = 200;

    if(othis.gameObject.zone.zoneInfo.raidLevel === "expert") {
        this.explosionPotency = 500;
    }
    else {
        this.explosionPotency = 200;
    }

    this.gameObject.addEventListener("MonsterDeath", function(args) {
        if(args.type === "death") {
            var nearbyMonsters = othis.monster.nearbyMonsters(100, 11, true);
            _.each(nearbyMonsters, function(aMonster) {
                if(aMonster.isBoss) {
                    if(othis.gameObject.zone.zoneInfo.raidLevel === "hard" || othis.gameObject.zone.zoneInfo.raidLevel === "expert") {
                        aMonster.addStatusEffect(StatusEffects.Effects.Vindictive, 120, {dmgBoostPct: 0.10});
                    }
                }
            });
        
            var nearbyMonsters = _.union(othis.monster.nearbyMonsters(15, 15, true), othis.monster.nearbyMonsters(15, 11, true));
            _.each(nearbyMonsters, function(aMonster) {
                if(!aMonster.isBoss && !aMonster.isDead) {
                    console.log("UNSTABLE HIT " + aMonster.getSyncedVar("monsterName"));                   //was 400
                    othis.monster.dealAoeDamage(aMonster.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.explosionPotency), dmgType: "magical", sender: othis.gameObject.entity, ignoreAggro: true});
                }
            });

            if(othis.gameObject.zone.zoneInfo.raidLevel === "expert") {
                var newminion = othis.gameObject.zone.spawnEntity("DangerPool", othis.gameObject.getWorldPosition());
                var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
                dangerPoolComponent.lifeRemaining = 60; // 2 minutes
                dangerPoolComponent.Setup(4.0, othis.monster.potencyDamage(200), null);
            }
        }
    });
}


module.exports = NecroMini;
