"""Smoke tests: server boots and basic endpoints respond."""


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "RestaurantOS"


def test_openapi_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["title"] == "RestaurantOS"
