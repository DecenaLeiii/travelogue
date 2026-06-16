-- Seed 20 Philippines destinations with placeholder images
insert into destinations (name, slug, region, short_description, content, images, featured)
values
('Boracay', 'boracay', 'Visayas', 'White-sand beaches and lively nightlife.', 'Boracay is famous for White Beach and watersports.', to_jsonb(array['/assets/destinations/boracay.jpg']), true),
('Palawan (El Nido)', 'el-nido', 'MIMAROPA', 'Limestone cliffs and island hopping.', 'El Nido offers dramatic karst landscapes and clear lagoons.', to_jsonb(array['/assets/destinations/el-nido.jpg']), true),
('Palawan (Coron)', 'coron', 'MIMAROPA', 'Shipwreck diving and freshwater lakes.', 'Coron is a top wreck-diving and snorkeling site.', to_jsonb(array['/assets/destinations/coron.jpg']), false),
('Chocolate Hills (Bohol)', 'chocolate-hills', 'Visayas', 'Unique karst hill formations.', 'The Chocolate Hills are a geological formation of over 1,000 hills.', to_jsonb(array['/assets/destinations/chocolate-hills.jpg']), false),
('Banaue Rice Terraces', 'banaue-rice-terraces', 'Cordillera', 'Ancient rice terraces carved into the mountains.', 'A UNESCO World Heritage site built by indigenous people.', to_jsonb(array['/assets/destinations/banaue.jpg']), false),
('Vigan', 'vigan', 'Ilocos', 'Spanish-colonial architecture and cobblestone streets.', 'Vigan is known for its preserved colonial townscape.', to_jsonb(array['/assets/destinations/vigan.jpg']), false),
('Mayon Volcano (Legazpi)', 'mayon-volcano', 'Bicol', 'Perfect cone volcano and outdoor activities.', 'Mayon Volcano offers scenic views and hiking opportunities.', to_jsonb(array['/assets/destinations/mayon.jpg']), false),
('Cebu (Kawasan Falls)', 'kawasan-falls', 'Visayas', 'Canyoneering and turquoise waterfalls.', 'Kawasan Falls is famous for canyoneering and clear waters.', to_jsonb(array['/assets/destinations/kawasan.jpg']), false),
('Siargao', 'siargao', 'Mindanao', 'Surfing capital with island lagoons.', 'Siargao is famous for Cloud 9 surf break and laid-back vibe.', to_jsonb(array['/assets/destinations/siargao.jpg']), true),
('Intramuros (Manila)', 'intramuros', 'NCR', 'Historic walled city in Manila.', 'Intramuros contains Fort Santiago and colonial-era churches.', to_jsonb(array['/assets/destinations/intramuros.jpg']), false),
('Taal Volcano', 'taal-volcano', 'Calabarzon', 'Crater lake within a volcano island.', 'Taal Volcano features a lake within a volcanic island.', to_jsonb(array['/assets/destinations/taal.jpg']), false),
('Panglao Island (Bohol)', 'panglao', 'Visayas', 'Beaches and diving near Bohol.', 'Panglao offers resorts, beaches, and diving access to coral reefs.', to_jsonb(array['/assets/destinations/panglao.jpg']), false),
('Davao (Eden Nature Park)', 'eden-nature-park', 'Mindanao', 'Highland resort with nature activities.', 'Eden Nature Park is a cool highland retreat near Davao City.', to_jsonb(array['/assets/destinations/eden.jpg']), false),
('Hundred Islands (Pangasinan)', 'hundred-islands', 'Luzon', 'Cluster of small islands with beaches.', 'Hundred Islands National Park is popular for island hopping.', to_jsonb(array['/assets/destinations/hundred-islands.jpg']), false),
('Fortune Island (Batangas)', 'fortune-island', 'Calabarzon', 'Clifftop ruins and snorkeling.', 'Fortune Island is known for Grecian-style ruins and clear waters.', to_jsonb(array['/assets/destinations/fortune-island.jpg']), false),
('Apo Island', 'apo-island', 'Visayas', 'Marine sanctuary for turtles and snorkeling.', 'Apo Island is a protected marine sanctuary with abundant turtles.', to_jsonb(array['/assets/destinations/apo.jpg']), false),
('Samal Island', 'samal-island', 'Mindanao', 'Beaches and beach resorts near Davao.', 'Samal Island is popular for resorts and white-sand beaches.', to_jsonb(array['/assets/destinations/samal.jpg']), false),
('Camiguin', 'camiguin', 'Mindanao', 'Small island with volcanoes and hot springs.', 'Camiguin offers hot springs, waterfalls, and diving.', to_jsonb(array['/assets/destinations/camiguin.jpg']), false),
('Mt. Pulag', 'mt-pulag', 'Cordillera', 'Highest peak in Luzon with sea-of-clouds.', 'Mt. Pulag is famed for its sunrise sea of clouds and trekking.', to_jsonb(array['/assets/destinations/pulag.jpg']), false),
('Pagudpud', 'pagudpud', 'Ilocos', 'Beaches and coastal scenery in northern Luzon.', 'Pagudpud is known for its pristine beaches and windmills.', to_jsonb(array['/assets/destinations/pagudpud.jpg']), false)
;
