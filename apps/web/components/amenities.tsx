import type { Amenities } from '@kle/shared/listing';
import { ROAD_DISTANCE_LABELS, floorLabel } from '@kle/shared/listing';

const PROFILE_LABELS: Record<string, string> = {
  etudiant: 'Étudiants',
  couple: 'Couples',
  famille: 'Familles',
  personne_seule: 'Personnes seules',
};

/** Détails cochés par le bailleur, visibles avant même de contacter. */
export function AmenitiesList({ a }: { a: Amenities }) {
  const yes = (v: boolean, label: string) => (v ? [label] : []);
  const groups: Array<[string, string[]]> = [
    [
      'Logement',
      [
        `${a.logement.bedrooms} chambre${a.logement.bedrooms > 1 ? 's' : ''}`,
        `${a.logement.livingRooms} salon${a.logement.livingRooms > 1 ? 's' : ''}`,
        `Douche ${a.logement.shower}`,
        `Toilettes ${a.logement.toilet === 'interne' ? 'internes' : 'externes'}`,
        a.logement.kitchen === 'aucune' ? 'Sans cuisine' : `Cuisine ${a.logement.kitchen}`,
        a.logement.furnished ? 'Meublé' : 'Non meublé',
      ],
    ],
    [
      'Bâtiment',
      [
        floorLabel(a.batiment.floor),
        ...yes(a.batiment.guardian, 'Gardien'),
        ...yes(a.batiment.gate, 'Portail'),
        ...yes(a.batiment.fence, 'Clôture'),
        ...yes(a.batiment.parking, 'Parking'),
        ...yes(a.batiment.yard, 'Cour'),
        ...yes(a.batiment.elevator, 'Ascenseur'),
      ],
    ],
    [
      'Accès',
      [
        ROAD_DISTANCE_LABELS[a.acces.roadDistance],
        a.acces.carAccessible ? 'Accessible en voiture' : 'Pas d’accès voiture',
        a.acces.rainySeasonPassable ? 'Praticable en saison des pluies' : 'Difficile en saison des pluies',
      ],
    ],
    [
      'Eau et électricité',
      [
        `Compteur électrique ${a.eauElectricite.electricityMeter === 'individuel' ? 'individuel' : 'partagé'}`,
        `Compteur d’eau ${a.eauElectricite.waterMeter === 'individuel' ? 'individuel' : 'partagé'}`,
        a.eauElectricite.waterSource === 'forage'
          ? 'Forage'
          : a.eauElectricite.waterSource === 'les_deux'
            ? 'Eau courante et forage'
            : 'Eau courante',
        ...yes(a.eauElectricite.generator, 'Groupe électrogène'),
      ],
    ],
    [
      'Confort',
      [
        ...yes(a.confort.airConditioning, 'Climatisation'),
        ...yes(a.confort.waterHeater, 'Chauffe-eau'),
        ...yes(a.confort.balcony, 'Balcon ou terrasse'),
        ...yes(a.confort.wardrobes, 'Placards'),
        ...yes(a.confort.tiles, 'Carrelage'),
        ...yes(a.confort.ceiling, 'Plafond'),
      ],
    ],
    [
      'Conditions',
      [
        `Pour : ${a.conditions.acceptedProfiles.map((p) => PROFILE_LABELS[p] ?? p).join(', ')}`,
        a.conditions.petsAllowed ? 'Animaux acceptés' : 'Animaux non acceptés',
      ],
    ],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups
        .filter(([, items]) => items.length)
        .map(([title, items]) => (
          <div key={title} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-sm font-bold">{title}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <li key={item} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink/80">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
