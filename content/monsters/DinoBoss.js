/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var DinoBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

DinoBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: DinoBoss
});

DinoBoss.prototype.Start = function() {
    var othis = this;

    this.myMinions = [];

    this.timeSinceBreath = 0;
    this.breathEveryMoves = 4;
    
    this.breathSize = new Vector3(5, 5, 10);
    this.breathForwardOffset = 2.0; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 1.5;
    this.breathPotency = 1200;

    this.timeSinceEgg = 0;
    this.eggEverySeconds = 10;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 5;
    this.monster.setMovementSpeed(5);
    this.monster.basicAttackEvery = 3;
    this.monster.basicAttackPotency = 250;
    this.monster.basicAttackDelay = 1.5;
    this.monster.deathDelay = 6;
    this.monster.giveUpChaseAfter = 120;
    this.monster.roamDistance = 0;

    this.gameObject.zone.setZoneVar("dinoBossAlive", true);
    this.gameObject.zone.setZoneVar("dinoBossEngaged", false);

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        _.each(othis.myMinions, function(aminion) {
            var minionMonster = aminion.getComponent("Monster");
            if(minionMonster && !minionMonster.isDead) {
                minionMonster.suicide();
            }
        });
        othis.myMinions = [];
        othis.gameObject.zone.setZoneVar("dinoBossEngaged", false);
    });

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.timeSinceBreath++;

        if(othis.timeSinceBreath > othis.breathEveryMoves) {
            if(args.takeOpportunity()) {
                othis.breathAttack(args.finishOpportunity);
                othis.timeSinceBreath = 0;
            }
        }

    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(!othis.monster.getSyncedVar("inCombat") === true) {
            othis.gameObject.zone.setZoneVar("dinoBossEngaged", false);
            return;
        }

        othis.gameObject.zone.setZoneVar("dinoBossEngaged", true);

        othis.timeSinceEgg += args.delta;

        if(othis.timeSinceEgg > othis.eggEverySeconds) {
            othis.timeSinceEgg = 0;
            othis.triggerEgg();
        }

        //othis.gameObject.zone.setZoneVar("dinoBossInCombat", othis.monster.getSyncedVar("inCombat")); //so our spawner knows if it should keep spawning in eggs or not.
        
    });

    this.gameObject.addEventListener("MonsterDeath", function(args) {
        othis.gameObject.zone.setZoneVar("dinoBossAlive", false);
        othis.gameObject.zone.setZoneVar("dinoBossEngaged", false);
    });
}

DinoBoss.prototype.triggerEgg = function() {
    var othis = this;
    var availableEggs = [];
    var nearbyCreatures = 
    _.each(this.gameObject.zone.sphereCast(this.gameObject.transform.position, 200), function(anobj) {
        var eggComponent = anobj.orbusCollider.gameObject.getComponent("DinoBossEgg");
        if(!eggComponent) {
            //console.log(amonster.gameObject.name + " has no DinoBossEgg component!");
            return;
        }
        availableEggs.push(eggComponent);
    });

    var anegg = _.sample(availableEggs);
    if(anegg) {
        anegg.beginHatch();
        setTimeout(function() {
            if(!othis.monster || othis.monster.isDead) return;
            var newminion = anegg.hatch(othis);
            othis.myMinions.push(newminion);
            newminion.addEventListener("MonsterDeath", function() {
                othis.myMinions = _.without(othis.myMinions, newminion);
            });
        }, 3000);
    }
};

DinoBoss.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath attack to finish.
        
    });
};


module.exports = DinoBoss;
