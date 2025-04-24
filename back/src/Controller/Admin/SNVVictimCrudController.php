<?php

namespace App\Controller\Admin;

use App\Entity\SNVVictim;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;

class SNVVictimCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return SNVVictim::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('scenario', 'Scénario');
        yield TextareaField::new('description', 'Description');
        yield ChoiceField::new('correctAnswer', 'Réponse correcte')
            ->setChoices([
                'Vert' => 0,
                'Jaune' => 1,
                'Rouge' => 2,
                'Noir' => 3
            ]);
        yield TextareaField::new('explanation', 'Explication');
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setPageTitle('index', 'Victimes SNV')
            ->setPageTitle('new', 'Créer une victime SNV')
            ->setPageTitle('edit', 'Modifier la victime SNV')
            ->setPageTitle('detail', 'Détails de la victime SNV')
            ->setDefaultSort(['scenario' => 'ASC']);
    }
} 