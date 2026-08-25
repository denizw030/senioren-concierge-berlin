from .costs import first_and_following_year
from .models import ConciergeRecommendation
from .ranking import rank_offers

def select_concierge_recommendations(offers, need, contract=None, limit=3):
    limit=max(0,min(limit,3))
    ranked=rank_offers(offers,need,contract); offer_map={o.offer_id:o for o in offers}
    eligible=[r for r in ranked if not r.blocked and not r.review_required]
    chosen=[]; ids=set()
    def add(label,r):
        if r and r.offer_id not in ids and len(chosen)<limit:
            o=offer_map[r.offer_id]; first,following=first_and_following_year(o)
            chosen.append(ConciergeRecommendation(label,o,r,first.total,following.total)); ids.add(r.offer_id)
    if eligible: add('best_option',eligible[0])
    stable=[r for r in eligible if (offer_map[r.offer_id].price_guarantee_months or 0)>=12]
    if stable: add('best_price_stable_option',stable[0])
    for r in eligible:
        add('sensible_alternative',r)
        if len(chosen)>=limit: break
    return chosen
