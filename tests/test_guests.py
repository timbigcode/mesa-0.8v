from src.modules.guests import get_or_create_guest, increment_visit_count
from src.models import Channel


def test_creates_new_guest_when_phone_not_found(db, restaurant):
    guest = get_or_create_guest(
        db, restaurant_id=restaurant.id,
        name="Bob", phone="+66811111111",
        email=None, channel=Channel.web,
    )
    assert guest.id is not None
    assert guest.phone == "+66811111111"
    assert guest.visit_count == 0


def test_returns_existing_guest_for_same_phone(db, restaurant):
    g1 = get_or_create_guest(db, restaurant_id=restaurant.id, name="Bob", phone="+66822222222", email=None, channel=Channel.web)
    g2 = get_or_create_guest(db, restaurant_id=restaurant.id, name="Bobby", phone="+66822222222", email=None, channel=Channel.web)
    assert g1.id == g2.id


def test_increment_visit_count(db, restaurant):
    guest = get_or_create_guest(db, restaurant_id=restaurant.id, name="Carol", phone="+66833333333", email=None, channel=Channel.phone)
    increment_visit_count(db, guest)
    db.refresh(guest)
    assert guest.visit_count == 1
