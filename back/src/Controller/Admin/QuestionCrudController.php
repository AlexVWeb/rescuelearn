<?php

namespace App\Controller\Admin;

use App\Entity\Question;
use App\Form\QuestionOptionType;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class QuestionCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Question::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('quiz', 'Quiz');
        yield TextareaField::new('text', 'Question');
        yield TextField::new('correctAnswer', 'Réponse correcte');
        yield TextareaField::new('explanation', 'Explication');
        yield CollectionField::new('options', 'Options')
            ->setEntryType(QuestionOptionType::class)
            ->allowAdd()
            ->allowDelete()
            ->setFormTypeOption('by_reference', false);
    }
} 