const { getCatalog } = require('./store');

// Sempre que o estatuto de um utilizador muda (torna-se dono, admin, ou ganha
// o badge de fundador), garante que os cosméticos exclusivos desse estatuto
// já estão no inventário — para poderem equipar imediatamente, sem precisar
// de resgatar um código manualmente.
function grantExclusiveCosmetics(user) {
  const catalog = getCatalog();
  const toGrant = catalog.items.filter((item) => {
    if (item.ownerOnly && user.isOwner) return true;
    if (item.adminOnly && user.isAdmin) return true;
    if (item.founderOnly && (user.badges || []).includes('founder')) return true;
    return false;
  });

  const newIds = toGrant.map((i) => i.id).filter((id) => !user.inventory.includes(id));
  if (newIds.length > 0) {
    user.inventory = [...user.inventory, ...newIds];
  }
  return user;
}

module.exports = { grantExclusiveCosmetics };
