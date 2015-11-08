'use strict';

var oo = require('../../util/oo');
var Component = require('../../ui/Component');
var DocumentationNodeComponent = require('./DocumentationNodeComponent');
var $$ = Component.$$;

function NamespaceComponent() {
  DocumentationNodeComponent.apply(this, arguments);
}

NamespaceComponent.Prototype = function() {

  this.render = function() {
    var node = this.props.node;
    return $$('div')
      .addClass('sc-namespace')
      .attr("data-id", node.id)
      .append(
        $$('div').addClass('se-name').html(node.id),
        $$('div').addClass('se-description').html(node.description),
        $$('div').addClass('se-members').append(this._renderMembers()),
        $$('div').addClass('se-node-type').addClass('namespace').append('namespace')
      );
  };
};

oo.inherit(NamespaceComponent, DocumentationNodeComponent);

module.exports = NamespaceComponent;
