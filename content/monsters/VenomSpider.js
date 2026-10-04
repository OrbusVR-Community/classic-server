/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var VenomSpider = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

VenomSpider.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: VenomSpider
});

VenomSpider.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.spawnedMinions = [];

    this.movesSinceSummon = 0;
    this.summonEverMoves = 4;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.movesSinceSummon++;
        if(othis.movesSinceSummon > othis.summonEverMoves && othis.spawnedMinions.length < 5) {
            othis.movesSinceSummon = 0;
            var aggroTable = othis.monster.getSortedAggroTable();
            for(var i=0; i < (5 - othis.spawnedMinions.length); i++) {
                othis.spawnMinion(_.sample(aggroTable));
            }
            othis.monster.triggerAnimation("summon");
            args.takeOpportunity();
            args.finishOpportunity();
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function(args) {
        _.each(othis.spawnedMinions, function(aminion) {
            if(aminion.gameObject && aminion.isDead === false) {
                aminion.suicide();
            }
        });
        othis.spawnedMinions = [];
    });
}

VenomSpider.prototype.spawnMinion = function(targetGameObject) {
    var othis = this;
    var randomval = Math.random() * 1;
    var myworldpos = this.gameObject.transform.position;
    var newent = othis.gameObject.zone.spawnEntity("VenomSpiderling", new Vector3(myworldpos.x + randomval, myworldpos.y, myworldpos.z + randomval));
    var newmonster = newent.gameObject.getComponent("Monster");
    _.defer(function() {
        newmonster.scaleToLevel(Math.max(1, othis.monster.getSyncedVar("willLevel") - 3));
        newmonster.xpModifier = 0;
        if(targetGameObject) {
            newmonster.addAggroForEntity(targetGameObject.entity, 100);
        }
    });
    this.spawnedMinions.push(newmonster);
    newmonster.gameObject.addEventListener("MonsterDeath", function() {
        othis.spawnedMinions = _.without(othis.spawnedMinions, newmonster);
    });
}


module.exports = VenomSpider;
